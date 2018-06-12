// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import { Project } from "../../models/project";
import actions, { ProjectAction } from "./project-action";
import { TreeItem } from "../../components/tree/tree";
import * as _ from "lodash";

export type ProjectState = Array<TreeItem<Project>>;

function findTreeItem<T>(tree: Array<TreeItem<T>>, itemId: string): TreeItem<T> | undefined {
    let item;
    for (const t of tree) {
        item = t.id === itemId
            ? t
            : findTreeItem(t.items ? t.items : [], itemId);
        if (item) {
            break;
        }
    }
    return item;
}

function resetTreeActivity<T>(tree: Array<TreeItem<T>>): boolean | undefined {
    let item;
    for (const leaf of tree) {
        item = leaf.active === true
            ? leaf.active = false
            : resetTreeActivity(leaf.items ? leaf.items : []);
    }
    return item;
}

const projectsReducer = (state: ProjectState = [], action: ProjectAction) => {
    return actions.match(action, {
        CREATE_PROJECT: project => [...state, project],
        REMOVE_PROJECT: () => state,
        PROJECTS_REQUEST: () => state,
        PROJECTS_SUCCESS: projects => {
            return projects;
        },
        TOGGLE_PROJECT_TREE_ITEM: itemId => {
            const tree = _.cloneDeep(state);
            resetTreeActivity(tree);
            const item = findTreeItem(tree, itemId);
            if (item) {
                item.open = !item.open;
                item.active = true;
            }
            return tree;
        },
        default: () => state
    });
};

export default projectsReducer;
