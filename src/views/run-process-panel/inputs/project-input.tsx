// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import React from 'react';
import { connect, DispatchProp } from 'react-redux';
import { Field } from 'redux-form';
import { Input, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@material-ui/core';
import {
    GenericCommandInputParameter
} from 'models/workflow';
import { GenericInputProps, GenericInput } from './generic-input';
import { ProjectsTreePicker } from 'views-components/projects-tree-picker/projects-tree-picker';
import { initProjectsTreePicker } from 'store/tree-picker/tree-picker-actions';
import { TreeItem } from 'components/tree/tree';
import { ProjectsTreePickerItem } from 'views-components/projects-tree-picker/generic-projects-tree-picker';
import { ProjectResource } from 'models/project';
import { ResourceKind } from 'models/resource';

const WORKFLOW_OWNER_PROJECT = "WORKFLOW_OWNER_PROJECT";

export interface ProjectInputProps {
    options?: { showOnlyOwned: boolean, showOnlyWritable: boolean };
}
export const ProjectInput = ({ options }: ProjectInputProps) =>
    <Field
        name={WORKFLOW_OWNER_PROJECT}
        commandInput={{
            label: "Owner project"
        }}
        component={ProjectInputComponent as any}
        format={format}
        {...{
            options
        }} />;

const format = (value?: ProjectResource) => value ? value.name : '';

interface ProjectInputComponentState {
    open: boolean;
    project?: ProjectResource;
}

const ProjectInputComponent = connect()(
    class ProjectInputComponent extends React.Component<GenericInputProps & DispatchProp & {
        options?: { showOnlyOwned: boolean, showOnlyWritable: boolean };
    }, ProjectInputComponentState> {
        state: ProjectInputComponentState = {
            open: false,
        };

        componentDidMount() {
            this.props.dispatch<any>(
                initProjectsTreePicker(WORKFLOW_OWNER_PROJECT));
        }

        render() {
            return <>
                {this.renderInput()}
                {this.renderDialog()}
            </>;
        }

        openDialog = () => {
            this.setState({ open: true });
        }

        closeDialog = () => {
            this.setState({ open: false });
        }

        submit = () => {
            this.closeDialog();
            this.props.input.onChange(this.state.project);
        }

        setProject = (_: {}, { data }: TreeItem<ProjectsTreePickerItem>) => {
            if ('kind' in data && data.kind === ResourceKind.PROJECT) {
                this.setState({ project: data });
            } else {
                this.setState({ project: undefined });
            }
        }

        renderInput() {
            return <GenericInput
                component={props =>
                    <Input
                        readOnly
                        fullWidth
                        value={props.input.value}
                        error={props.meta.touched && !!props.meta.error}
                        disabled={props.commandInput.disabled}
                        onClick={!this.props.commandInput.disabled ? this.openDialog : undefined}
                        onKeyPress={!this.props.commandInput.disabled ? this.openDialog : undefined} />}
                {...this.props} />;
        }

        renderDialog() {
            return <Dialog
                open={this.state.open}
                onClose={this.closeDialog}
                fullWidth
                data-cy="choose-a-project-dialog"
                maxWidth='md'>
                <DialogTitle>Choose a project</DialogTitle>
                <DialogContent>
                    <ProjectsTreePicker
                        pickerId={WORKFLOW_OWNER_PROJECT}
                        includeCollections
                        options={this.props.options}
                        toggleItemActive={this.setProject} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.closeDialog}>Cancel</Button>
                    <Button
                        disabled={!this.state.project}
                        variant='contained'
                        color='primary'
                        onClick={this.submit}>Ok</Button>
                </DialogActions>
            </Dialog>;
        }

    });
