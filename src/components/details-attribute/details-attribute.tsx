// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import Typography from '@material-ui/core/Typography';
import { StyleRulesCallback, WithStyles, withStyles } from '@material-ui/core/styles';
import { ArvadosTheme } from '../../common/custom-theme';
import * as classnames from "classnames";

type CssRules = 'attribute' | 'label' | 'value' | 'link';

const styles: StyleRulesCallback<CssRules> = (theme: ArvadosTheme) => ({
    attribute: {
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.unit
    },
    label: {
        color: theme.palette.grey["500"],
        width: '40%'
    },
    value: {
        width: '60%',
        display: 'flex',
        alignItems: 'flex-start',
        textTransform: 'capitalize'
    },
    link: {
        width: '60%',
        color: theme.palette.primary.main,
        textDecoration: 'none',
        overflowWrap: 'break-word'
    }
});

interface DetailsAttributeDataProps {
    label: string;
    classLabel?: string;
    value?: string | number;
    classValue?: string;
    link?: string;
    children?: React.ReactNode;
}

type DetailsAttributeProps = DetailsAttributeDataProps & WithStyles<CssRules>;

export const DetailsAttribute = withStyles(styles)(({ label, link, value, children, classes, classLabel, classValue }: DetailsAttributeProps) =>
    <Typography component="div" className={classes.attribute}>
        <Typography component="span" className={classnames([classes.label, classLabel])}>{label}</Typography>
        { link
            ? <a href={link} className={classes.link} target='_blank'>{value}</a>
            : <Typography component="span" className={classnames([classes.value, classValue])}>
                {value}
                {children}
            </Typography> }
    </Typography>
);
