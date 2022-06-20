/**
 * Copyright 2017-2022 Sourcepole AG
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {setEditContext} from '../actions/editing';
import {LayerRole, addLayerFeatures, removeLayer} from '../actions/layers';
import AttributeForm from './AttributeForm';
import LocaleUtils from '../utils/LocaleUtils';
import MapUtils from '../utils/MapUtils';
import './style/LinkFeatureForm.css';

class LinkFeatureForm extends React.Component {
    static propTypes = {
        action: PropTypes.string,
        addLayerFeatures: PropTypes.func,
        editConfig: PropTypes.object,
        editContextId: PropTypes.string,
        editing: PropTypes.object,
        featureId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        finished: PropTypes.func,
        iface: PropTypes.object,
        map: PropTypes.object,
        removeLayer: PropTypes.func,
        setEditContext: PropTypes.func
    }
    state = {
        editContext: {},
        pickedFeatures: null,
        highlightedFeature: null
    }
    componentDidMount() {
        if (this.props.action === 'Edit') {
            this.props.iface.getFeatureById(this.props.editConfig.editDataset, this.props.featureId, this.props.map.projection, (result) => {
                if (result) {
                    this.props.setEditContext(this.props.editContextId, {action: 'Pick', feature: result, geomType: this.props.editConfig.geomType});
                }
            });
        } else if (this.props.action === 'Create') {
            this.props.setEditContext(this.props.editContextId, {action: 'Draw', geomType: this.props.editConfig.geomType});
        } else if (this.props.action === 'Pick') {
            this.props.setEditContext(this.props.editContextId, {action: null});
        }
    }
    componentDidUpdate(prevProps) {
        // Handle drawPick
        const editContext = this.props.editing.contexts[this.props.editContextId];
        if (editContext && editContext.action === null && this.props.map.click && this.props.map.click !== prevProps.map.click) {
            this.childPickQuery(this.props.map.click.coordinate);
        }
    }
    render() {
        const editContext = this.props.editing.contexts[this.props.editContextId];
        if (!editContext) {
            return null;
        }

        if (editContext.action === null) {
            // Picking
            return (
                <div className="link-feature-form">
                    {!this.state.pickedFeatures ? (
                        <div className="link-feature-form-hint">
                            <span>{LocaleUtils.tr("linkfeatureform.pickhint")}</span>
                        </div>
                    ) : (
                        <div className="link-feature-form-feature-list">
                            {this.state.pickedFeatures.map(feature => (
                                <div key={feature.id} onClick={() => this.pickFeatureSelected(feature)}
                                    onMouseOut={() => this.unhoverFeature(feature)} onMouseOver={() => this.hoverFeature(feature)}
                                >{feature.id}</div>
                            ))}
                        </div>
                    )}
                    <div className="link-feature-form-close">
                        <button className="button" disabled={editContext.changed} onClick={this.finish}>
                            {LocaleUtils.tr("linkfeatureform.cancel")}
                        </button>
                    </div>
                </div>
            );
        } else {
            const drawing = (editContext.action === 'Draw' && !editContext.feature);

            return (
                <div className="link-feature-form">
                    {drawing ? (
                        <div className="link-feature-form-hint">
                            <span>{LocaleUtils.tr("linkfeatureform.drawhint")}</span>
                        </div>
                    ) : (
                        <AttributeForm editConfig={this.props.editConfig} editContext={editContext}
                            iface={this.props.iface} newfeature={editContext.action === 'Draw'}
                        />
                    )}
                    <div className="link-feature-form-close">
                        <button className="button" disabled={editContext.changed} onClick={this.finish}>
                            {drawing ? LocaleUtils.tr("linkfeatureform.cancel") : LocaleUtils.tr("linkfeatureform.finish")}
                        </button>
                    </div>
                </div>
            );
        }
    }
    childPickQuery = (coordinate) => {
        const scale = Math.round(MapUtils.computeForZoom(this.props.map.scales, this.props.map.zoom));
        this.props.iface.getFeature(this.props.editConfig.editDataset, coordinate, this.props.map.projection, scale, 96, (featureCollection) => {
            const features = featureCollection ? featureCollection.features : null;
            if (features.length === 1) {
                this.props.finished(features[0].id);
            } else {
                this.setState({pickedFeatures: features});
            }
        });
    }
    finish = () => {
        const editContext = this.props.editing.contexts[this.props.editContextId];
        this.props.finished((editContext.feature || {}).id ?? null);
    }
    hoverFeature = (feature) => {
        const layer = {
            id: this.props.editContextId + "-pick-selection",
            role: LayerRole.SELECTION
        };
        this.props.addLayerFeatures(layer, [feature], true);
        this.setState({highlightedFeature: feature.id});
    }
    unhoverFeature = (feature) => {
        if (this.state.highlightedFeature === feature.id) {
            this.props.removeLayer(this.props.editContextId + "-pick-selection");
            this.setState({highlightedFeature: null});
        }
    }
    pickFeatureSelected = (feature) => {
        this.unhoverFeature(feature);
        this.props.finished(feature.id);
    }
}

export default connect((state) => ({
    editing: state.editing,
    map: state.map
}), {
    addLayerFeatures: addLayerFeatures,
    removeLayer: removeLayer,
    setEditContext: setEditContext
})(LinkFeatureForm);