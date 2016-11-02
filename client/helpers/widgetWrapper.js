import React, { Component, PropTypes } from 'react'; //PropTypes
import { connect } from 'react-redux';
import { getAppPageVar } from './stateHelper';
import { uniqueId,  get } from 'lodash';
import { buildInstancePath } from 'helpers/actionHelper';
import { devPlugins, prodPlugins } from './WidgetPlugins';

// wrapper for widgets, add a wrapper to get state
export const widgetWrapper = widgetProps => {
  // const uniqueId = (prefix='') => {
  //   return prefix + new Date().getTime() + Math.round(Math.random()*10000);
  // };
  return WrappedComponent => {

    const displayName = `Widget${WrappedComponent.displayName}`;

    class Widget extends Component {
      static displayName = displayName

      static contextTypes = {
        props: PropTypes.object,
        // context: PropTypes.object,
        cm: PropTypes.object
      }

      static childContextTypes = {
        props: PropTypes.object,
        // context: PropTypes.object,
        cm: PropTypes.object
      }

      _componentId = uniqueId(displayName + '-')

      constructor(props, context) {
        super(props, context);
        this.plugins = [];
        this.registerPlugins();
        this.cm = this.context.cm;
        this.cm.registerComponent(this.instancePath, this.props.targetInstance);
        // this.cm.printComponentTree();
        // this.cm.acceptBalls();
        this.executePluginMethod('onInitialize');
      }

      registerPlugins() {
        if (__DEV__) { // eslint-disable-line
          this.plugins = devPlugins.map((Plugin) => {
            if (Plugin.name) {
              return new Plugin();
            }
          });
        }

        this.plugins = this.plugins.concat(prodPlugins.map((Plugin) => {
          if (Plugin && Plugin.name) {
            return new Plugin();
          }
        }));
      }

      executePluginMethod(methodName, props, ...args) {
        let result = props;
        this.plugins.forEach((plugin) => {
          if (plugin && plugin[methodName]) {
            let _result = plugin[methodName].call(this, args, result);
            if (!_result && plugin.name) {
              console.warn('No result returns from ', plugin.name );
            } else {
              result = _result;
            }
          }
        });
        return result;
      }

      createInstancePath(prefix='') {
        if (!prefix) {
          prefix = this.componentName;
        }
        return buildInstancePath(this.pageName, this.pageId, prefix, uniqueId(prefix + '-') );
      }

      get componentName() {
        return displayName;
      }

      get componentId() {
        return this._componentId;
      }

      get instanceData() {
        const data = this.props.page.getIn(this.instancePath);
        if (data) {
          return data.toJS();
        } else {
          return {};
        }
      }

      get pageId() {
        return this.context.props.pagePath[1] || 'UNKNOWN-PAGE-ID';
      }

      get pageName() {
        return this.context.props.pagePath[0] || 'UNKNOWN-PAGE';
      }

      get visible() {
        return this.props.page.getIn([ ...this.instancePath, 'visible' ], true);
      }

      get data() {
        return this.props.page.getIn([ ...this.instancePath, 'data' ]);
      }

      get activeData() {
        return this.props.page.getIn([ ...this.instancePath, 'active-data' ]);
      }

      get instancePath() {
        if (this.props._instancePath) {
          return this.props._instancePath;
        }
        return buildInstancePath(this.pageName, this.pageId, this.componentName, this.componentId );
      }

      // get wrappedComponentPath() {
      //   return buildInstancePath(this.pageName, this.pageId, WrappedComponent.displayName, WrappedComponent.componentId );
      // }

      getChildContext() {
        let props = Object.assign(
          {},
          this.context.props,
          this.getNewProps()
        );
        // console.log(props);
        return { props: props, cm: this.context.cm };
      }

      componentWillMount() {
        this.executePluginMethod('onMount');
      }

      componentWillUnmount() {
        this.executePluginMethod('onUnmount');
        this.cm.ballKicker.removeEvent(this.instancePath);
      }

      componentWillReceiveProps(nextProps, nextState) {
        this.executePluginMethod('onReceiveProps', nextProps, nextState);
      }

      componentWillUpdate(nextProps, nextState) {
        return this.executePluginMethod('onBeforeUpdate', nextProps, nextState) || true;
      }

      shouldComponentUpdate(nextProps, nextState) {
        return this.executePluginMethod('onShouldUpdate', nextProps, nextState) || true;
      }

      checkComponentNeedUpdate(needUpdateFields, nextProps, thisProps) {
        // const needUpdateFields = [ 'input.value', 'data', 'visible', 'activeData' ];
        for (let i in needUpdateFields) {
          const fieldName = needUpdateFields[i];
          const nextValue = get(nextProps, fieldName), thisValue = get(thisProps, fieldName);
          if (nextValue != thisValue) {
            return true;
          }
        }
        return false;
      }

      getNewProps() {
        let pluginProps = this.executePluginMethod('onBeforeSetProps');
        let props = Object.assign(
          {},
          this.props,
          // this.getNewMethods(this.instancePath),
          {
            instancePath: this.instancePath,
            parentPath: this.context.props.instancePath,
            data: this.data,
            // initialValues: this.data || this.context.props.initialValues,
            visible: this.visible,
            activeData: this.activeData,
            instanceData: this.instanceData,
            checkComponentNeedUpdate: this.checkComponentNeedUpdate.bind(this),
            createInstancePath: this.createInstancePath.bind(this),
            findParent: this.cm.findParent.bind(this.cm, this.instancePath),
            findTargetByName: this.cm.findTargetByComponentName.bind(this.cm),
            findBallReceiver: this.cm.findTargetReceiver.bind(this.cm, this.instancePath),
            kickBall: this.cm.ballKicker.kick.bind(this.cm.ballKicker, this.instancePath),
            catchBall: this.cm.ballKicker.accept.bind(this.cm.ballKicker, this.instancePath),
            registerBalls: this.cm.listener.registerStandardBalls.bind(this.cm.listener, this.instancePath)
          },
          pluginProps
        );

        return props;
      }

      render() {
        const newProps = this.getNewProps();
        // console.log('widgetProps',  this.componentId, this.visible);
        return (this.visible ? <WrappedComponent  {...newProps} /> : null);
      }
    }

    const stateMapper = (state) => {
      return {
        // env: getAppEnvVar(state),
        page: getAppPageVar(state),
        app: state.getIn([ 'app' ]),
        form: state.getIn([ 'form' ]),
        ...widgetProps
      };
    };

    const ConnnectedWidget = connect(stateMapper)(Widget);
    const targetComponentName = `TargetWidget${WrappedComponent.displayName}`;

    class TargetWrapper extends Component {
      static displayName = targetComponentName

      componentId = uniqueId( targetComponentName + '-')

      static contextTypes = {
        props: PropTypes.object,
        cm: PropTypes.object
      }

      // static childContextTypes = {
      //   props: PropTypes.object,
      //   cm: PropTypes.object
      // }

      constructor(props, context) {
        super(props, context);
        const { instancePath, pagePath } = this.context.props;
        this.context.cm.registerComponent(this.instancePath, instancePath || pagePath);
      }

      // getChildContext() {
      //   return {  props: this.context.props, cm: this.context.cm };
      // }

      // shouldComponentUpdate(nextProps, nextState) {
      //   if (!this.props.noOptimize) {
      //     return !isEqual(this.props, nextProps) && !isEqual(nextState, this.state);
      //   }
      // }

      get instancePath() {
        const componentName = targetComponentName;
        const componentId = this.componentId;
        // console.log(this.context.props);
        const [ pageName, pageId ] = this.context.props.pagePath;
        // console.log(this.context.props, pageName, pageId, componentName, componentId );
        return buildInstancePath(pageName, pageId, componentName, componentId );
      }

      render() {
        const { children, ...rest } = this.props;
        return (<ConnnectedWidget targetInstance={this.instancePath} {...rest} >{children}</ConnnectedWidget>);
      }
    }
    return TargetWrapper;
  };
};

export default widgetWrapper;
