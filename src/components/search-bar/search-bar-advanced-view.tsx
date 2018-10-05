// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { Paper, StyleRulesCallback, withStyles, WithStyles, List, Button } from '@material-ui/core';
import { SearchView } from '~/store/structured-search/structured-search-reducer';
import { renderRecentQueries } from '~/components/search-bar/search-bar';

type CssRules = 'list';

const styles: StyleRulesCallback<CssRules> = theme => {
    return {
        list: {
            padding: '0px'
        }
    };
};

interface SearchBarAdvancedViewProps {
    setView: (currentView: string) => void;
}

export const SearchBarAdvancedView = withStyles(styles)(
    ({ classes, setView }: SearchBarAdvancedViewProps & WithStyles<CssRules>) =>
        <Paper>
            <List component="nav" className={classes.list}>
                {renderRecentQueries('ADVANCED VIEW')}
            </List>
            <Button onClick={() => setView(SearchView.BASIC)}>Back</Button>
        </Paper>
);