// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { Grid, Paper, Toolbar, StyleRulesCallback, withStyles, WithStyles, TablePagination, IconButton, Tooltip } from '@material-ui/core';
import MoreVertIcon from "@material-ui/icons/MoreVert";
import { ColumnSelector } from "../column-selector/column-selector";
import { DataTable, DataColumns } from "../data-table/data-table";
import { DataColumn, SortDirection } from "../data-table/data-column";
import { DataTableFilterItem } from '../data-table-filters/data-table-filters';
import { SearchInput } from '../search-input/search-input';
import { ArvadosTheme } from "~/common/custom-theme";

type CssRules = 'searchBox' | "toolbar";

const styles: StyleRulesCallback<CssRules> = (theme: ArvadosTheme) => ({
    searchBox: {
        paddingBottom: theme.spacing.unit * 2
    },
    toolbar: {
        paddingTop: theme.spacing.unit * 2
    },
});

interface DataExplorerDataProps<T> {
    items: T[];
    itemsAvailable: number;
    columns: DataColumns<T>;
    searchValue: string;
    rowsPerPage: number;
    rowsPerPageOptions: number[];
    page: number;
    contextMenuColumn: boolean;
    dataTableDefaultView?: React.ReactNode;
}

interface DataExplorerActionProps<T> {
    onSetColumns: (columns: DataColumns<T>) => void;
    onSearch: (value: string) => void;
    onRowClick: (item: T) => void;
    onRowDoubleClick: (item: T) => void;
    onColumnToggle: (column: DataColumn<T>) => void;
    onContextMenu: (event: React.MouseEvent<HTMLElement>, item: T) => void;
    onSortToggle: (column: DataColumn<T>) => void;
    onFiltersChange: (filters: DataTableFilterItem[], column: DataColumn<T>) => void;
    onChangePage: (page: number) => void;
    onChangeRowsPerPage: (rowsPerPage: number) => void;
    extractKey?: (item: T) => React.Key;
}

type DataExplorerProps<T> = DataExplorerDataProps<T> & DataExplorerActionProps<T> & WithStyles<CssRules>;

export const DataExplorer = withStyles(styles)(
    class DataExplorerGeneric<T> extends React.Component<DataExplorerProps<T>> {
        componentDidMount() {
            if (this.props.onSetColumns) {
                this.props.onSetColumns(this.props.columns);
            }
        }
        render() {
            const {
                columns, onContextMenu, onFiltersChange, onSortToggle, extractKey,
                rowsPerPage, rowsPerPageOptions, onColumnToggle, searchValue, onSearch,
                items, itemsAvailable, onRowClick, onRowDoubleClick, classes,
                dataTableDefaultView
            } = this.props;
            return <Paper>
                <Toolbar className={classes.toolbar}>
                    <Grid container justify="space-between" wrap="nowrap" alignItems="center">
                        <div className={classes.searchBox}>
                            <SearchInput
                                value={searchValue}
                                onSearch={onSearch} />
                        </div>
                        <ColumnSelector
                            columns={columns}
                            onColumnToggle={onColumnToggle} />
                    </Grid>
                </Toolbar>
                <DataTable
                    columns={this.props.contextMenuColumn ? [...columns, this.contextMenuColumn] : columns}
                    items={items}
                    onRowClick={(_, item: T) => onRowClick(item)}
                    onContextMenu={onContextMenu}
                    onRowDoubleClick={(_, item: T) => onRowDoubleClick(item)}
                    onFiltersChange={onFiltersChange}
                    onSortToggle={onSortToggle}
                    extractKey={extractKey}
                    defaultView={dataTableDefaultView}
                />
                <Toolbar>
                    <Grid container justify="flex-end">
                        <TablePagination
                            count={itemsAvailable}
                            rowsPerPage={rowsPerPage}
                            rowsPerPageOptions={rowsPerPageOptions}
                            page={this.props.page}
                            onChangePage={this.changePage}
                            onChangeRowsPerPage={this.changeRowsPerPage}
                            component="div" />
                    </Grid>
                </Toolbar>
            </Paper>;
        }

        changePage = (event: React.MouseEvent<HTMLButtonElement>, page: number) => {
            this.props.onChangePage(page);
        }

        changeRowsPerPage: React.ChangeEventHandler<HTMLTextAreaElement | HTMLInputElement> = (event) => {
            this.props.onChangeRowsPerPage(parseInt(event.target.value, 10));
        }

        renderContextMenuTrigger = (item: T) =>
            <Grid container justify="flex-end">
                <Tooltip title="More options">
                    <IconButton onClick={event => this.props.onContextMenu(event, item)}>
                        <MoreVertIcon />
                    </IconButton>
                </Tooltip>
            </Grid>

        contextMenuColumn: DataColumn<any> = {
            name: "Actions",
            selected: true,
            configurable: false,
            sortDirection: SortDirection.NONE,
            filters: [],
            key: "context-actions",
            render: this.renderContextMenuTrigger
        };
    }
);
