import React from 'react';
// import { BootstrapTable } from 'react-bootstrap-table';  // in ECMAScript 6
import { widgetWrapper } from 'helpers/widgetWrapper';
import { FormControl, FormGroup, ControlLabel, Col, Button } from 'react-bootstrap';

class EditableCom extends React.Component {
  static displayName = 'EditableCom'

  change(event) {
    // console.log(event.target.value);
    this.props.hold(event.target.value);
  }

  save() {
    this.props.save();
    const invalid = this.props.getDataInvalid();
    console.log('After saving, invalid:::', invalid);
  }

  render() {
    // console.log(this.props);
    const { title } = this.props;
    return (
      <FormGroup>
        <Col componentClass={ControlLabel} sm={2}>
          {title || 'Empty Title'}
        </Col>
        <Col sm={6}>
          <FormControl type="text" placeholder="Test Input" onChange={::this.change} value={this.props.activeData}/>
        </Col>
        <Col sm={4}><Button bsStyle="default" bsSize="large" onClick={::this.save}>Apply</Button></Col>
      </FormGroup>
    );
  }
}

export default widgetWrapper([ 'app' ])(EditableCom);
