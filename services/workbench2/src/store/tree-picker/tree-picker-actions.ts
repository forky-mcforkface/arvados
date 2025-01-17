// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import { unionize, ofType, UnionOf } from "common/unionize";
import { TreeNode, initTreeNode, getNodeDescendants, TreeNodeStatus, getNode, TreePickerId, Tree, setNode, createTree } from 'models/tree';
import { CollectionFileType, createCollectionFilesTree, getCollectionResourceCollectionUuid } from "models/collection-file";
import { Dispatch } from 'redux';
import { RootState } from 'store/store';
import { getUserUuid } from "common/getuser";
import { ServiceRepository } from 'services/services';
import { FilterBuilder } from 'services/api/filter-builder';
import { pipe, values } from 'lodash/fp';
import { ResourceKind } from 'models/resource';
import { GroupContentsResource } from 'services/groups-service/groups-service';
import { getTreePicker, TreePicker } from './tree-picker';
import { ProjectsTreePickerItem } from './tree-picker-middleware';
import { OrderBuilder } from 'services/api/order-builder';
import { ProjectResource } from 'models/project';
import { mapTree } from '../../models/tree';
import { LinkResource, LinkClass } from "models/link";
import { mapTreeValues } from "models/tree";
import { sortFilesTree } from "services/collection-service/collection-service-files-response";
import { GroupClass, GroupResource } from "models/group";
import { CollectionResource } from "models/collection";

export const treePickerActions = unionize({
    LOAD_TREE_PICKER_NODE: ofType<{ id: string, pickerId: string }>(),
    LOAD_TREE_PICKER_NODE_SUCCESS: ofType<{ id: string, nodes: Array<TreeNode<any>>, pickerId: string }>(),
    APPEND_TREE_PICKER_NODE_SUBTREE: ofType<{ id: string, subtree: Tree<any>, pickerId: string }>(),
    TOGGLE_TREE_PICKER_NODE_COLLAPSE: ofType<{ id: string, pickerId: string }>(),
    EXPAND_TREE_PICKER_NODE: ofType<{ id: string, pickerId: string }>(),
    ACTIVATE_TREE_PICKER_NODE: ofType<{ id: string, pickerId: string, relatedTreePickers?: string[] }>(),
    DEACTIVATE_TREE_PICKER_NODE: ofType<{ pickerId: string }>(),
    TOGGLE_TREE_PICKER_NODE_SELECTION: ofType<{ id: string, pickerId: string }>(),
    SELECT_TREE_PICKER_NODE: ofType<{ id: string | string[], pickerId: string }>(),
    DESELECT_TREE_PICKER_NODE: ofType<{ id: string | string[], pickerId: string }>(),
    EXPAND_TREE_PICKER_NODES: ofType<{ ids: string[], pickerId: string }>(),
    RESET_TREE_PICKER: ofType<{ pickerId: string }>()
});

export type TreePickerAction = UnionOf<typeof treePickerActions>;

export interface LoadProjectParams {
    includeCollections?: boolean;
    includeDirectories?: boolean;
    includeFiles?: boolean;
    includeFilterGroups?: boolean;
    options?: { showOnlyOwned: boolean; showOnlyWritable: boolean; };
}

export const treePickerSearchActions = unionize({
    SET_TREE_PICKER_PROJECT_SEARCH: ofType<{ pickerId: string, projectSearchValue: string }>(),
    SET_TREE_PICKER_COLLECTION_FILTER: ofType<{ pickerId: string, collectionFilterValue: string }>(),
    SET_TREE_PICKER_LOAD_PARAMS: ofType<{ pickerId: string, params: LoadProjectParams }>(),
    REFRESH_TREE_PICKER: ofType<{ pickerId: string }>(),
});

export type TreePickerSearchAction = UnionOf<typeof treePickerSearchActions>;

export const getProjectsTreePickerIds = (pickerId: string) => ({
    home: `${pickerId}_home`,
    shared: `${pickerId}_shared`,
    favorites: `${pickerId}_favorites`,
    publicFavorites: `${pickerId}_publicFavorites`,
    search: `${pickerId}_search`,
});

export const getAllNodes = <Value>(pickerId: string, filter = (node: TreeNode<Value>) => true) => (state: TreePicker) =>
    pipe(
        () => values(getProjectsTreePickerIds(pickerId)),

        ids => ids
            .map(id => getTreePicker<Value>(id)(state)),

        trees => trees
            .map(getNodeDescendants(''))
            .reduce((allNodes, nodes) => allNodes.concat(nodes), []),

        allNodes => allNodes
            .reduce((map, node) =>
                filter(node)
                    ? map.set(node.id, node)
                    : map, new Map<string, TreeNode<Value>>())
            .values(),

        uniqueNodes => Array.from(uniqueNodes),
    )();
export const getSelectedNodes = <Value>(pickerId: string) => (state: TreePicker) =>
    getAllNodes<Value>(pickerId, node => node.selected)(state);

export const initProjectsTreePicker = (pickerId: string, selectedItemUuid?: string) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        const { home, shared, favorites, publicFavorites, search } = getProjectsTreePickerIds(pickerId);
        dispatch<any>(initUserProject(home));
        dispatch<any>(initSharedProject(shared));
        dispatch<any>(initFavoritesProject(favorites));
        dispatch<any>(initPublicFavoritesProject(publicFavorites));
        dispatch<any>(initSearchProject(search));

        if (selectedItemUuid) {
            dispatch<any>(loadInitialValue(selectedItemUuid, pickerId));
        }
    };

interface ReceiveTreePickerDataParams<T> {
    data: T[];
    extractNodeData: (value: T) => { id: string, value: T, status?: TreeNodeStatus };
    id: string;
    pickerId: string;
}

export const receiveTreePickerData = <T>(params: ReceiveTreePickerDataParams<T>) =>
    (dispatch: Dispatch) => {
        const { data, extractNodeData, id, pickerId, } = params;
        dispatch(treePickerActions.LOAD_TREE_PICKER_NODE_SUCCESS({
            id,
            nodes: data.map(item => initTreeNode(extractNodeData(item))),
            pickerId,
        }));
        dispatch(treePickerActions.EXPAND_TREE_PICKER_NODE({ id, pickerId }));
    };

interface LoadProjectParamsWithId extends LoadProjectParams {
    id: string;
    pickerId: string;
    loadShared?: boolean;
    searchProjects?: boolean;
}

export const loadProject = (params: LoadProjectParamsWithId) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        const {
            id,
            pickerId,
            includeCollections = false,
            includeDirectories = false,
            includeFiles = false,
            includeFilterGroups = false,
            loadShared = false,
            options,
            searchProjects = false
        } = params;

        dispatch(treePickerActions.LOAD_TREE_PICKER_NODE({ id, pickerId }));

        let filterB = new FilterBuilder();

        filterB = (includeCollections && !searchProjects)
            ? filterB.addIsA('uuid', [ResourceKind.PROJECT, ResourceKind.COLLECTION])
            : filterB.addIsA('uuid', [ResourceKind.PROJECT]);

        const state = getState();

        if (state.treePickerSearch.collectionFilterValues[pickerId]) {
            filterB = filterB.addFullTextSearch(state.treePickerSearch.collectionFilterValues[pickerId], 'collections');
        } else {
            filterB = filterB.addNotIn("collections.properties.type", ["intermediate", "log"]);
        }

        if (searchProjects && state.treePickerSearch.projectSearchValues[pickerId]) {
            filterB = filterB.addFullTextSearch(state.treePickerSearch.projectSearchValues[pickerId], 'groups');
        }

        const filters = filterB.getFilters();

        const itemLimit = 200;

        const { items, itemsAvailable } = await services.groupsService.contents((loadShared || searchProjects) ? '' : id, { filters, excludeHomeProject: loadShared || undefined, limit: itemLimit });

        if (itemsAvailable > itemLimit) {
            items.push({
                uuid: "more-items-available",
                kind: ResourceKind.WORKFLOW,
                name: `*** Not all items listed (${items.length} out of ${itemsAvailable}), reduce item count with search or filter ***`,
                description: "",
                definition: "",
                ownerUuid: "",
                createdAt: "",
                modifiedByClientUuid: "",
                modifiedByUserUuid: "",
                modifiedAt: "",
                href: "",
                etag: ""
            });
        }

        dispatch<any>(receiveTreePickerData<GroupContentsResource>({
            id,
            pickerId,
            data: items.filter((item) => {
                if (!includeFilterGroups && (item as GroupResource).groupClass && (item as GroupResource).groupClass === GroupClass.FILTER) {
                    return false;
                }

                if (options && options.showOnlyWritable && item.hasOwnProperty('frozenByUuid') && (item as ProjectResource).frozenByUuid) {
                    return false;
                }

                return true;
            }),
            extractNodeData: item => (
                item.uuid === "more-items-available" ?
                    {
                        id: item.uuid,
                        value: item,
                        status: TreeNodeStatus.LOADED
                    }
                    : {
                        id: item.uuid,
                        value: item,
                        status: item.kind === ResourceKind.PROJECT
                            ? TreeNodeStatus.INITIAL
                            : includeDirectories || includeFiles
                                ? TreeNodeStatus.INITIAL
                                : TreeNodeStatus.LOADED
                    }),
        }));
    };

export const loadCollection = (id: string, pickerId: string, includeDirectories?: boolean, includeFiles?: boolean) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        dispatch(treePickerActions.LOAD_TREE_PICKER_NODE({ id, pickerId }));

        const picker = getTreePicker<ProjectsTreePickerItem>(pickerId)(getState().treePicker);
        if (picker) {

            const node = getNode(id)(picker);
            if (node && 'kind' in node.value && node.value.kind === ResourceKind.COLLECTION) {
                const files = (await services.collectionService.files(node.value.uuid))
                    .filter((file) => (
                        (includeFiles) ||
                        (includeDirectories && file.type === CollectionFileType.DIRECTORY)
                    ));
                const tree = createCollectionFilesTree(files);
                const sorted = sortFilesTree(tree);
                const filesTree = mapTreeValues(services.collectionService.extendFileURL)(sorted);

                dispatch(
                    treePickerActions.APPEND_TREE_PICKER_NODE_SUBTREE({
                        id,
                        pickerId,
                        subtree: mapTree(node => ({ ...node, status: TreeNodeStatus.LOADED }))(filesTree)
                    }));

                dispatch(treePickerActions.TOGGLE_TREE_PICKER_NODE_COLLAPSE({ id, pickerId }));
            }
        }
    };

export const HOME_PROJECT_ID = 'Home Projects';
export const initUserProject = (pickerId: string) =>
    async (dispatch: Dispatch<any>, getState: () => RootState, services: ServiceRepository) => {
        const uuid = getUserUuid(getState());
        if (uuid) {
            dispatch(receiveTreePickerData({
                id: '',
                pickerId,
                data: [{ uuid, name: HOME_PROJECT_ID }],
                extractNodeData: value => ({
                    id: value.uuid,
                    status: TreeNodeStatus.INITIAL,
                    value,
                }),
            }));
        }
    };
export const loadUserProject = (pickerId: string, includeCollections = false, includeDirectories = false, includeFiles = false, options?: { showOnlyOwned: boolean, showOnlyWritable: boolean }) =>
    async (dispatch: Dispatch<any>, getState: () => RootState, services: ServiceRepository) => {
        const uuid = getUserUuid(getState());
        if (uuid) {
            dispatch(loadProject({ id: uuid, pickerId, includeCollections, includeDirectories, includeFiles, options }));
        }
    };

export const SHARED_PROJECT_ID = 'Shared with me';
export const initSharedProject = (pickerId: string) =>
    async (dispatch: Dispatch<any>, getState: () => RootState, services: ServiceRepository) => {
        dispatch(receiveTreePickerData({
            id: '',
            pickerId,
            data: [{ uuid: SHARED_PROJECT_ID, name: SHARED_PROJECT_ID }],
            extractNodeData: value => ({
                id: value.uuid,
                status: TreeNodeStatus.INITIAL,
                value,
            }),
        }));
    };

export const loadInitialValue = (initialValue: string, pickerId: string) =>
    async (dispatch: Dispatch<any>, getState: () => RootState, services: ServiceRepository) => {
        const { home, shared } = getProjectsTreePickerIds(pickerId);
        const homeUuid = getUserUuid(getState());
        const ancestors = (await services.ancestorsService.ancestors(initialValue, ''))
            .filter(item =>
                item.kind === ResourceKind.GROUP ||
                item.kind === ResourceKind.COLLECTION
            ) as (GroupResource | CollectionResource)[];

        if (ancestors.length) {
            const isUserHomeProject = !!(homeUuid && ancestors.some(item => item.ownerUuid === homeUuid));
            const pickerTreeId = isUserHomeProject ? home : shared;
            const pickerTreeRootUuid: string = (homeUuid && isUserHomeProject) ? homeUuid : SHARED_PROJECT_ID;

            ancestors[0].ownerUuid = '';
            const tree = createInitialLocationTree(ancestors, initialValue);
            dispatch(
                treePickerActions.APPEND_TREE_PICKER_NODE_SUBTREE({
                    id: pickerTreeRootUuid,
                    pickerId: pickerTreeId,
                    subtree: tree
                }));
            dispatch(treePickerActions.ACTIVATE_TREE_PICKER_NODE({ id: initialValue, pickerId: pickerTreeId }));
            dispatch(treePickerSearchActions.REFRESH_TREE_PICKER({ pickerId: pickerTreeId }));
        }

    }

export const FAVORITES_PROJECT_ID = 'Favorites';
export const initFavoritesProject = (pickerId: string) =>
    async (dispatch: Dispatch<any>, getState: () => RootState, services: ServiceRepository) => {
        dispatch(receiveTreePickerData({
            id: '',
            pickerId,
            data: [{ uuid: FAVORITES_PROJECT_ID, name: FAVORITES_PROJECT_ID }],
            extractNodeData: value => ({
                id: value.uuid,
                status: TreeNodeStatus.INITIAL,
                value,
            }),
        }));
    };

export const PUBLIC_FAVORITES_PROJECT_ID = 'Public Favorites';
export const initPublicFavoritesProject = (pickerId: string) =>
    async (dispatch: Dispatch<any>, getState: () => RootState, services: ServiceRepository) => {
        dispatch(receiveTreePickerData({
            id: '',
            pickerId,
            data: [{ uuid: PUBLIC_FAVORITES_PROJECT_ID, name: PUBLIC_FAVORITES_PROJECT_ID }],
            extractNodeData: value => ({
                id: value.uuid,
                status: TreeNodeStatus.INITIAL,
                value,
            }),
        }));
    };

export const SEARCH_PROJECT_ID = 'Search all Projects';
export const initSearchProject = (pickerId: string) =>
    async (dispatch: Dispatch<any>, getState: () => RootState, services: ServiceRepository) => {
        dispatch(receiveTreePickerData({
            id: '',
            pickerId,
            data: [{ uuid: SEARCH_PROJECT_ID, name: SEARCH_PROJECT_ID }],
            extractNodeData: value => ({
                id: value.uuid,
                status: TreeNodeStatus.INITIAL,
                value,
            }),
        }));
    };


interface LoadFavoritesProjectParams {
    pickerId: string;
    includeCollections?: boolean;
    includeDirectories?: boolean;
    includeFiles?: boolean;
    options?: { showOnlyOwned: boolean, showOnlyWritable: boolean };
}

export const loadFavoritesProject = (params: LoadFavoritesProjectParams,
    options: { showOnlyOwned: boolean, showOnlyWritable: boolean } = { showOnlyOwned: true, showOnlyWritable: false }) =>
    async (dispatch: Dispatch<any>, getState: () => RootState, services: ServiceRepository) => {
        const { pickerId, includeCollections = false, includeDirectories = false, includeFiles = false } = params;
        const uuid = getUserUuid(getState());
        if (uuid) {
            const filters = pipe(
                (fb: FilterBuilder) => includeCollections
                    ? fb.addIsA('head_uuid', [ResourceKind.PROJECT, ResourceKind.COLLECTION])
                    : fb.addIsA('head_uuid', [ResourceKind.PROJECT]),
                fb => fb.getFilters(),
            )(new FilterBuilder());

            const { items } = await services.favoriteService.list(uuid, { filters }, options.showOnlyOwned);

            dispatch<any>(receiveTreePickerData<GroupContentsResource>({
                id: 'Favorites',
                pickerId,
                data: items.filter((item) => {
                    if (options.showOnlyWritable && !(item as GroupResource).canWrite) {
                        return false;
                    }

                    if (options.showOnlyWritable && item.hasOwnProperty('frozenByUuid') && (item as ProjectResource).frozenByUuid) {
                        return false;
                    }

                    return true;
                }),
                extractNodeData: item => ({
                    id: item.uuid,
                    value: item,
                    status: item.kind === ResourceKind.PROJECT
                        ? TreeNodeStatus.INITIAL
                        : includeDirectories || includeFiles
                            ? TreeNodeStatus.INITIAL
                            : TreeNodeStatus.LOADED
                }),
            }));
        }
    };

export const loadPublicFavoritesProject = (params: LoadFavoritesProjectParams) =>
    async (dispatch: Dispatch<any>, getState: () => RootState, services: ServiceRepository) => {
        const { pickerId, includeCollections = false, includeDirectories = false, includeFiles = false } = params;
        const uuidPrefix = getState().auth.config.uuidPrefix;
        const publicProjectUuid = `${uuidPrefix}-j7d0g-publicfavorites`;

        const filters = pipe(
            (fb: FilterBuilder) => includeCollections
                ? fb.addIsA('head_uuid', [ResourceKind.PROJECT, ResourceKind.COLLECTION])
                : fb.addIsA('head_uuid', [ResourceKind.PROJECT]),
            fb => fb
                .addEqual('link_class', LinkClass.STAR)
                .addEqual('owner_uuid', publicProjectUuid)
                .getFilters(),
        )(new FilterBuilder());

        const { items } = await services.linkService.list({ filters });

        dispatch<any>(receiveTreePickerData<LinkResource>({
            id: 'Public Favorites',
            pickerId,
            data: items.filter(item => {
                if (params.options && params.options.showOnlyWritable && item.hasOwnProperty('frozenByUuid') && (item as any).frozenByUuid) {
                    return false;
                }

                return true;
            }),
            extractNodeData: item => ({
                id: item.headUuid,
                value: item,
                status: item.headKind === ResourceKind.PROJECT
                    ? TreeNodeStatus.INITIAL
                    : includeDirectories || includeFiles
                        ? TreeNodeStatus.INITIAL
                        : TreeNodeStatus.LOADED
            }),
        }));
    };

export const receiveTreePickerProjectsData = (id: string, projects: ProjectResource[], pickerId: string) =>
    (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        dispatch(treePickerActions.LOAD_TREE_PICKER_NODE_SUCCESS({
            id,
            nodes: projects.map(project => initTreeNode({ id: project.uuid, value: project })),
            pickerId,
        }));

        dispatch(treePickerActions.TOGGLE_TREE_PICKER_NODE_COLLAPSE({ id, pickerId }));
    };

export const loadProjectTreePickerProjects = (id: string) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        dispatch(treePickerActions.LOAD_TREE_PICKER_NODE({ id, pickerId: TreePickerId.PROJECTS }));


        const ownerUuid = id.length === 0 ? getUserUuid(getState()) || '' : id;
        const { items } = await services.projectService.list(buildParams(ownerUuid));

        dispatch<any>(receiveTreePickerProjectsData(id, items, TreePickerId.PROJECTS));
    };

export const loadFavoriteTreePickerProjects = (id: string) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        const parentId = getUserUuid(getState()) || '';

        if (id === '') {
            dispatch(treePickerActions.LOAD_TREE_PICKER_NODE({ id: parentId, pickerId: TreePickerId.FAVORITES }));
            const { items } = await services.favoriteService.list(parentId);
            dispatch<any>(receiveTreePickerProjectsData(parentId, items as ProjectResource[], TreePickerId.FAVORITES));
        } else {
            dispatch(treePickerActions.LOAD_TREE_PICKER_NODE({ id, pickerId: TreePickerId.FAVORITES }));
            const { items } = await services.projectService.list(buildParams(id));
            dispatch<any>(receiveTreePickerProjectsData(id, items, TreePickerId.FAVORITES));
        }

    };

export const loadPublicFavoriteTreePickerProjects = (id: string) =>
    async (dispatch: Dispatch, getState: () => RootState, services: ServiceRepository) => {
        const parentId = getUserUuid(getState()) || '';

        if (id === '') {
            dispatch(treePickerActions.LOAD_TREE_PICKER_NODE({ id: parentId, pickerId: TreePickerId.PUBLIC_FAVORITES }));
            const { items } = await services.favoriteService.list(parentId);
            dispatch<any>(receiveTreePickerProjectsData(parentId, items as ProjectResource[], TreePickerId.PUBLIC_FAVORITES));
        } else {
            dispatch(treePickerActions.LOAD_TREE_PICKER_NODE({ id, pickerId: TreePickerId.PUBLIC_FAVORITES }));
            const { items } = await services.projectService.list(buildParams(id));
            dispatch<any>(receiveTreePickerProjectsData(id, items, TreePickerId.PUBLIC_FAVORITES));
        }

    };

const buildParams = (ownerUuid: string) => {
    return {
        filters: new FilterBuilder()
            .addEqual('owner_uuid', ownerUuid)
            .getFilters(),
        order: new OrderBuilder<ProjectResource>()
            .addAsc('name')
            .getOrder()
    };
};

/**
 * Given a tree picker item, return collection uuid and path
 *   if the item represents a valid target/destination location
 */
export type FileOperationLocation = {
    uuid: string;
    path: string;
}
export const getFileOperationLocation = (item: ProjectsTreePickerItem): FileOperationLocation | undefined => {
    if ('kind' in item && item.kind === ResourceKind.COLLECTION) {
        return {
            uuid: item.uuid,
            path: '/'
        };
    } else if ('type' in item && item.type === CollectionFileType.DIRECTORY) {
        const uuid = getCollectionResourceCollectionUuid(item.id);
        if (uuid) {
            return {
                uuid,
                path: [item.path, item.name].join('/')
            };
        } else {
            return undefined;
        }
    } else {
        return undefined;
    }
};

/**
 * Create an expanded tree picker subtree from array of nested projects/collection
 *   Assumes the root item of the subtree already has an empty string ownerUuid
 */
export const createInitialLocationTree = (data: Array<GroupResource | CollectionResource>, tailUuid: string) => {
    return data
        .reduce((tree, item) => setNode({
            children: [],
            id: item.uuid,
            parent: item.ownerUuid,
            value: item,
            active: false,
            selected: false,
            expanded: false,
            status: item.uuid !== tailUuid ? TreeNodeStatus.LOADED : TreeNodeStatus.INITIAL,
        })(tree), createTree<GroupResource | CollectionResource>());
};
