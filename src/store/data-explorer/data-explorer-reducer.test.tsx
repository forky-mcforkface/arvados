// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import { dataExplorerReducer, initialDataExplorer } from "./data-explorer-reducer";
import { dataExplorerActions } from "./data-explorer-action";
import { DataTableFilterItem } from "../../components/data-table-filters/data-table-filters";
import { DataColumns } from "../../components/data-table/data-table";
import { SortDirection } from "../../components/data-table/data-column";

describe('data-explorer-reducer', () => {
    it('should set columns', () => {
        const columns: DataColumns<any> = [{
            name: "Column 1",
            render: jest.fn(),
            selected: true
        }];
        const state = dataExplorerReducer(undefined,
            dataExplorerActions.SET_COLUMNS({ id: "Data explorer", columns }));
        expect(state["Data explorer"].columns).toEqual(columns);
    });

    it('should toggle sorting', () => {
        const columns: DataColumns<any> = [{
            name: "Column 1",
            render: jest.fn(),
            selected: true,
            sortDirection: SortDirection.Asc
        }, {
            name: "Column 2",
            render: jest.fn(),
            selected: true,
            sortDirection: SortDirection.None,
        }];
        const state = dataExplorerReducer({ "Data explorer": { ...initialDataExplorer, columns } },
            dataExplorerActions.TOGGLE_SORT({ id: "Data explorer", columnName: "Column 2" }));
        expect(state["Data explorer"].columns[0].sortDirection).toEqual("none");
        expect(state["Data explorer"].columns[1].sortDirection).toEqual("asc");
    });

    it('should set filters', () => {
        const columns: DataColumns<any> = [{
            name: "Column 1",
            render: jest.fn(),
            selected: true,
        }];

        const filters: DataTableFilterItem[] = [{
            name: "Filter 1",
            selected: true
        }];
        const state = dataExplorerReducer({ "Data explorer": { ...initialDataExplorer, columns } },
            dataExplorerActions.SET_FILTERS({ id: "Data explorer", columnName: "Column 1", filters }));
        expect(state["Data explorer"].columns[0].filters).toEqual(filters);
    });

    it('should set items', () => {
        const state = dataExplorerReducer({ "Data explorer": undefined },
            dataExplorerActions.SET_ITEMS({
                id: "Data explorer",
                items: ["Item 1", "Item 2"],
                page: 0,
                rowsPerPage: 10,
                itemsAvailable: 100
            }));
        expect(state["Data explorer"].items).toEqual(["Item 1", "Item 2"]);
    });

    it('should set page', () => {
        const state = dataExplorerReducer({ "Data explorer": undefined },
            dataExplorerActions.SET_PAGE({ id: "Data explorer", page: 2 }));
        expect(state["Data explorer"].page).toEqual(2);
    });

    it('should set rows per page', () => {
        const state = dataExplorerReducer({ "Data explorer": undefined },
            dataExplorerActions.SET_ROWS_PER_PAGE({ id: "Data explorer", rowsPerPage: 5 }));
        expect(state["Data explorer"].rowsPerPage).toEqual(5);
    });
});
