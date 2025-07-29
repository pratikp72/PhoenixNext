import {inject, bindable, computedFrom, BindingEngine} from 'aurelia-framework';
import {DndService} from 'bcx-aurelia-dnd';
import {EventAggregator} from 'aurelia-event-aggregator';
import { Editor } from '../editor';
import { Chart } from 'chart.js'
import { formhelper } from '../formhelper';


@inject(DndService, EventAggregator, BindingEngine, Editor, formhelper)
export class ChartBar {
  @bindable item;

  elementClass=null;

  myChart=null;

  constructor(dndService, EventAggregator, BindingEngine, Editor, formhelper) {
    this.dndService = dndService;
    this.ea = EventAggregator;
    this.bindingEngine = BindingEngine;
    this.editor = Editor;
    this.formhelper = formhelper
  }

  activate(model){

    var refreshChartObject = this.item ? true : false;

    this.item = model.item;

    if(refreshChartObject && this.item){
      const ops = this.formhelper.defaultChartOptions(this.item.data.type);
      const data = this.formhelper.defaultChartData(this.item.data.type);
      this.setChartType(this.item.data.type, ops, data);
      this.updateChart();
    }
  }

  getConfig(type, data, options, plugins){
    return{
      type: type ? type : 'bar',
      data: data ? data : {},
      options: options ? options : {},
      plugins: plugins ? plugins : []
    }
  }

  setDataset(index, data){
    let self = this;
    if(self.myChart){
      self.myChart.data.datasets[index].data = data;
      //self.myChart.update();
    }
  }

  removeLabels(){
    let self = this;
    if(self.myChart){
      self.myChart.data.labels=[];
      self.myChart.update();
    }
  }

  updateLabels(labelArray){
    let self = this;
    if(self.myChart){
      self.myChart.data.labels=labelArray
      self.myChart.update();
    }
  }

  updateChart(){
    let self = this;
    if(self.myChart){
      self.myChart.update();
    }
  }

  updateAxesTimeUnit(axes, timeUnit){
    var frmt = this.getTooltipFormatForTimeUnit(timeUnit);
    let self = this;
    if(self.myChart){
      if(axes == 'x'){
        self.myChart.options.scales.xAxes[0].time={
          unit: timeUnit,
          round: timeUnit,
          tooltipFormat: frmt
        } 
      }else{//y
        self.myChart.options.scales.yAxes[0].time={
          unit: timeUnit,
          round: timeUnit,
          tooltipFormat: frmt
        } 
      }
      self.myChart.update();
    }
  }

  getTooltipFormatForTimeUnit(timeUnit){
    if(timeUnit == 'month'){
      return 'MMM YYYY';
    }else if(timeUnit == 'day'){
      return 'MMM D';
    }else{
      //year...
      return 'YYYY';
    }
  }

  setAxesForTime(axes, timeUnit){
    let self = this;
    if(self.myChart){
      if(axes == 'x'){
          self.myChart.options.scales.xAxes[0]={
            type: 'time',
            scaleLabel:{
              display: true,
              labelString: 'Some Dates!'
            },
            distribution: 'linear',//'series',
            bounds: 'data',//ticks
            time:{
              unit: timeUnit,
              round: timeUnit,
              tooltipFormat: 'MMM YYYY'
            }
         }             
        }else{
            //Y...
            self.myChart.options.scales.yAxes[0]={
              type: 'time',
              scaleLabel:{
                display: true,
                labelString: 'Some Dates!'
              },
              distribution: 'linear',//'series',
              bounds: 'data',//ticks
              time:{
                unit: timeUnit,
                round: timeUnit,
                tooltipFormat: self.getTooltipFormatForTimeUnit(timeUnit)
              }
           }  
        }      

        //self.myChart.update();
    }
  }

  setAxesScaleTicks(axes, beginAtZero, minScale, maxScale){
    let self = this;
    if(self.myChart){
      if(axes == 'x'){
          self.myChart.options.scales.xAxes[0]={
                type: 'linear',
                ticks:{
                  stepSize: 1,
                  beginAtZero: beginAtZero,
                  min: minScale,
                  max: maxScale
                }
               }              
        }else{
            //Y...
            self.myChart.options.scales.yAxes[0]={
                type: 'linear',
                ticks:{
                  stepSize: 1,
                  beginAtZero: beginAtZero,
                  min: minScale,
                  max: maxScale
                }
           } 
        }      
    }
    self.myChart.update();
  }

  setAxesAsLinear(axes){
    let self = this;
    if(self.myChart){
      if(axes == 'x'){
          self.myChart.options.scales.xAxes[0]={
                type: 'linear',
                ticks:{
                  stepSize: 1,
                  beginAtZero: true
                }
               }              
        }else{
            //Y...
            self.myChart.options.scales.yAxes[0]={
                type: 'linear',
                ticks:{
                  stepSize: 1,
                  beginAtZero: true
                }
           } 
        }      
    }
    //self.myChart.update();
  }
  
  setChartType(type, options, data){
    let self = this;
    if(self.myChart){
      const tOps = options ? options : _.cloneDeep(self.myChart.options);
      const tData = data ? data : _.cloneDeep(self.myChart.data);
      self.myChart.destroy();
      self.myChart = new Chart(self.canvasChart, {
        type: type,
        data: tData, 
        options: tOps
      });
      self.item.data.type = type;
    }
  }

  setAxesForCategory(){

  }

  setChartAxesType(axes, type, timeUnit){
    let self = this;
    if(self.myChart){
      if(axes == 'x'){
        self.myChart.options.scales.xAxes[0].type = type;
        if(type == 'time' && timeUnit){
          if(self.myChart.options.scales.xAxes[0].hasOwnProperty('time')){
            self.myChart.options.scales.xAxes[0].time.unit= timeUnit;
          }else{
            self.myChart.options.scales.xAxes[0].time ={
              unit: timeUnit
            }
          }    
          //remove scale label... 
          self.myChart.options.scales.xAxes[0].scaleLabel = undefined;
        }
      }else{
        self.myChart.options.scales.yAxes[0].type = type;
        if(type == 'time' && timeUnit){
          if(self.myChart.options.scales.yAxes[0].hasOwnProperty('time')){
            self.myChart.options.scales.yAxes[0].time.unit= timeUnit;
          }else{
            self.myChart.options.scales.yAxes[0].time ={
              unit: timeUnit
            }
          }     
        }
      }
      self.myChart.update();
    }
  }

  runChart(){
    var ctx = this.canvasChart;

    this.myChart = new Chart(ctx, {
      type: this.item.data.type,
      data: this.item.data.data, 
      options: this.item.data.options
    });
  }


  // runChart(){
  //   var ctx = this.canvasChart;

  //   this.myChart = new Chart(ctx, {
  //     type: 'bar',
  //     data: {
  //         //labels: ['Red', 'Blue', 'Green'],

  //         datasets: [{
  //             label: '# of Votes',
  //              //data: [{x: new Date('2024-01-18'), y: 1}, {x: new Date('2024-04-10'), y: 4}, {x: new Date('2024-05-07'), y: 1}],
  //              //data: [{x: 1705600800, y: 1}, {x: 1712768400, y: 4}, {x: 1715101200, y: 1}],
  //             // data: [{x: 1705600800000, y: 1}, {x: 1712768400000, y: 4}, {x: 1715101200000, y: 1}],
  //             // data: [{x: '2024-01-18 03:00:05.237', y: 1}, {x: "2024-04-10 12:30:49.000", y: 4}, {x: "2024-05-07 01:14:08.103", y: 1}],
  //             //data: [{X: '2024-01-18 03:00:05.237', Y: '1'}, {X: "2024-04-10 12:30:49.000", Y: '4'}, {X: "2024-05-07 01:14:08.103", Y: '2'}],
  //            // data: [{X: '2024-09-20', Y: '1'}, {X: "2024-09-21", Y: '4'}, {X: "2024-09-22", Y: '2'}, {X: "2024-09-23", Y: '5'}, {X: "2024-09-24", Y: '3'}],
  //             //data: this.item.data.data,



                  // data: [{x: 1704067200000, y: '16'},
                  // {x: 1706745600000, y: '10'},
                  // {x: 1709251200000, y: '8'},
                  // {x: 1711929600000, y: '26'},
                  // {x: 1714521600000, y: '7'},
                  // {x: 1719792000000, y: '1'},
                  // {x: 1725148800000, y: '2'}],


              // backgroundColor: [
              //     'rgba(255, 99, 132, 0.2)',
              //     'rgba(54, 162, 235, 0.2)',
              //     'rgba(255, 206, 86, 0.2)',
              //     'rgba(75, 192, 192, 0.2)',
              //     'rgba(153, 102, 255, 0.2)',
              //     'rgba(255, 159, 64, 0.2)'
              // ],
              // borderColor: [
              //     'rgba(255, 99, 132, 1)',
              //     'rgba(54, 162, 235, 1)',
              //     'rgba(255, 206, 86, 1)',
              //     'rgba(75, 192, 192, 1)',
              //     'rgba(153, 102, 255, 1)',
              //     'rgba(255, 159, 64, 1)'
              // ],
  //             borderWidth: 1
  //         }]
  //     },
  //     options: {
  //         scales: {
  //             xAxes: [{
  //               type: 'time',
  //               scaleLabel:{
  //                 display: true,
  //                 labelString: 'Some Dates!'
  //               },
  //               distribution: 'linear',//'series',
  //               bounds: 'data',//ticks
  //               time:{
  //                 unit: 'month',
  //                 round: 'month'
  //               }
  //            }],
  //            yAxes:[{
  //             type: 'linear',
  //             ticks:{
  //               stepSize: 1,
  //               beginAtZero: true
  //             }
  //            }]  
  //           }
  //         }
  // });
  // }

  attached() {
    let self = this;

    if(self.item){

      self.elementClass =self.item.addBoxClass ? 'box' : 'table-style';

      const elem = document.getElementById(self.item.id);
      self.dndService.addSource(self, {noPreview: true, element: elem});
  
      self.bindingEngine
        .propertyObserver(self.item, 'style')
          .subscribe((newVal, oldVal) => {
            self.editor.updateItem(self.item);
          });
  
      self.bindingEngine
        .propertyObserver(self.item, 'html')
          .subscribe((newVal, oldVal) => {
            self.editor.updateItem(self.item);
          });
  
    }

    self.runChart();
  }

  detached() {
    this.dndService.removeSource(this);
  }

  itemClicked(e){

    // if(this.item.showToolbar){
    //   e.stopPropagation();
    //   return;
    // }

    this.ea.publish("itemClicked", this.item);
    e.stopPropagation();
  }

  dndModel() {
    return {
      type: 'moveItem',
      id: this.item.id
    };
  }

  @computedFrom('item', 'item.x', 'item.y', 'item.width', 'item.height', 'item.selected')
  get positionCss() {
    const x = (this.item && this.item.x) || 0;
    const y = (this.item && this.item.y) || 0;
    var width = (this.item && this.item.width) || 0;
    width = (width == '100%' || width == 'auto') ? width : width + 'px';
    const height = (this.item && this.item.height) || 0;
    const boxCursor = (this.item && this.item.selected) ? "pointer" : "default";
    const border = (this.item && this.item.selected) ? "1px dashed #007bff" : "none";

    return {
      left: x + 'px',
      top: y + 'px',
      width: width,// + 'px',
      height: height + 'px',
      cursor: boxCursor,
      border: border
    };
  }
}
