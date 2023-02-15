// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import React from 'react';
import {
    StyleRulesCallback,
    WithStyles,
    withStyles,
    Card,
    CardHeader,
    IconButton,
    CardContent,
    Tooltip,
    Typography,
    Button,
} from '@material-ui/core';
import { ArvadosTheme } from 'common/custom-theme';
import { CloseIcon, MoreOptionsIcon, ProcessIcon, StartIcon } from 'components/icon/icon';
import { Process } from 'store/processes/process';
import { MPVPanelProps } from 'components/multi-panel-view/multi-panel-view';
import { ProcessDetailsAttributes } from './process-details-attributes';
import { ProcessStatus } from 'views-components/data-explorer/renderers';
import { ContainerState } from 'models/container';
import { ContainerRequestState } from 'models/container-request';

type CssRules = 'card' | 'content' | 'title' | 'header' | 'cancelButton' | 'avatar' | 'iconHeader' | 'runButton';

const styles: StyleRulesCallback<CssRules> = (theme: ArvadosTheme) => ({
    card: {
        height: '100%'
    },
    header: {
        paddingTop: theme.spacing.unit,
        paddingBottom: theme.spacing.unit,
    },
    iconHeader: {
        fontSize: '1.875rem',
        color: theme.customs.colors.greyL,
    },
    avatar: {
        alignSelf: 'flex-start',
        paddingTop: theme.spacing.unit * 0.5
    },
    content: {
        padding: theme.spacing.unit * 1.0,
        paddingTop: theme.spacing.unit * 0.5,
        '&:last-child': {
            paddingBottom: theme.spacing.unit * 1,
        }
    },
    title: {
        overflow: 'hidden',
        paddingTop: theme.spacing.unit * 0.5,
        color: theme.customs.colors.green700,
    },
    cancelButton: {
        paddingRight: theme.spacing.unit * 2,
        fontSize: '14px',
        color: theme.customs.colors.red900,
        "&:hover": {
            cursor: 'pointer'
        }
    },
    runButton: {
        padding: "0px 5px 0 0",
        marginRight: "5px",
    },
});

export interface ProcessDetailsCardDataProps {
    process: Process;
    cancelProcess: (uuid: string) => void;
    startProcess: (uuid: string) => void;
    resumeOnHoldWorkflow: (uuid: string) => void;
    onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
}

type ProcessDetailsCardProps = ProcessDetailsCardDataProps & WithStyles<CssRules> & MPVPanelProps;

export const ProcessDetailsCard = withStyles(styles)(
    ({ cancelProcess, startProcess, resumeOnHoldWorkflow, onContextMenu, classes, process, doHidePanel, panelName }: ProcessDetailsCardProps) => {
        let runAction: ((uuid: string) => void) | undefined = undefined;
        if (process.containerRequest.state === ContainerRequestState.UNCOMMITTED) {
            runAction = startProcess;
        } else if (process.containerRequest.state === ContainerRequestState.COMMITTED &&
                    process.containerRequest.priority === 0) {
            runAction = resumeOnHoldWorkflow;
        }

        return <Card className={classes.card}>
            <CardHeader
                className={classes.header}
                classes={{
                    content: classes.title,
                    avatar: classes.avatar,
                }}
                avatar={<ProcessIcon className={classes.iconHeader} />}
                title={
                    <Tooltip title={process.containerRequest.name} placement="bottom-start">
                        <Typography noWrap variant='h6'>
                            {process.containerRequest.name}
                        </Typography>
                    </Tooltip>
                }
                subheader={
                    <Tooltip title={getDescription(process)} placement="bottom-start">
                        <Typography noWrap variant='body1' color='inherit'>
                            {getDescription(process)}
                        </Typography>
                    </Tooltip>}
                action={
                    <div>
                        {runAction !== undefined &&
                            <Button
                                variant="contained"
                                size="small"
                                color="primary"
                                className={classes.runButton}
                                onClick={() => runAction && runAction(process.containerRequest.uuid)}>
                                <StartIcon />
                                Run Process
                            </Button>}
                        {process.container &&
                            (process.container.state === ContainerState.QUEUED ||
                            process.container.state === ContainerState.LOCKED ||
                            process.container.state === ContainerState.RUNNING) &&
                            process.containerRequest.priority !== null &&
                            process.containerRequest.priority > 0 &&
                            <span data-cy="process-cancel" className={classes.cancelButton} onClick={() => cancelProcess(process.containerRequest.uuid)}>Cancel</span>}
                        <ProcessStatus uuid={process.containerRequest.uuid} />
                        <Tooltip title="More options" disableFocusListener>
                            <IconButton
                                aria-label="More options"
                                onClick={event => onContextMenu(event)}>
                                <MoreOptionsIcon />
                            </IconButton>
                        </Tooltip>
                        { doHidePanel &&
                        <Tooltip title={`Close ${panelName || 'panel'}`} disableFocusListener>
                            <IconButton onClick={doHidePanel}><CloseIcon /></IconButton>
                        </Tooltip> }
                    </div>
                } />
            <CardContent className={classes.content}>
                <ProcessDetailsAttributes request={process.containerRequest} twoCol hideProcessPanelRedundantFields />
            </CardContent>
        </Card>;
    }
);

const getDescription = (process: Process) =>
    process.containerRequest.description || '(no-description)';
