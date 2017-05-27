//var AppActions = require("../actions/AppActions.jsx");

var React = require("react");
var ReactBootstrap = require("react-bootstrap");
var    Button          = ReactBootstrap.Button;
//Require app components
var FilteringAttribute = require("./FilteringAttribute.jsx");

var Glyphicon = ReactBootstrap.Glyphicon;
var Masonry = require("react-masonry-component");

class InteractiveFilters extends React.Component {
    constructor(props, context) {
      super(props, context);
      return {full:false};
    }
    fullView(){
        if(this.state.full){
            if(this.state.full === false){
                this.setState({full: true});
            }
            else{
                this.setState({full: false});
            }

        }else{

            this.setState({full:true});
        }
    }
    toggleShow(){
        this.setState({toggle: true});
    }

    render(){
        var filteringAttributes;


        var self = this;
        var key = 0;

        var theme = {};

        if(this.props.dashboardConfig){
            theme = this.props.dashboardConfig.theme;

        }


        if(this.props.config){
            filteringAttributes = this.props.config.map(function(filteringAttribute){
                key++;
                return (
                    <FilteringAttribute key={key} onToggleShow={self.toggleShow} config={filteringAttribute} currData={self.props.currData} full={self.state.full} />
                );
            });
        }


        if(this.state.full){
            return(
                <div  className="col-sm-12 fixed" id="interactiveFiltersPanelFull">

                    <Button onClick={this.fullView} id="interactiveFiltersPanelSlider" title="Minimize Filters" bsSize="large">
                        <Glyphicon glyph="chevron-left" />
                    </Button>
                    <Masonry className={"filteringFullView"} elementType={"div"} options={{itemSelector: ".grid-item"}} >
                        <div className="filteringAttributesList">{filteringAttributes}</div>

                    </Masonry>
                </div>
            );

        } else {
            return(
                <div  className="" id="interactiveFiltersPanel"  >

                     <Button title="Full view" onClick={this.fullView}  id="interactiveFiltersPanelSlider" bsSize="large">
                        <Glyphicon glyph="chevron-right" />
                     </Button>
                    <Masonry className={"filteringFullView"} elementType={"div"} options={{itemSelector: ".grid-item", isFitWidth: true}}>
                        <div className="filteringAttributesList">{filteringAttributes}</div>

                    </Masonry>

                </div>
            );
        }

    }
}

module.exports = InteractiveFilters;
