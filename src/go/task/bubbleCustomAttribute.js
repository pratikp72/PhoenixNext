import {customAttribute} from 'aurelia-framework';
import {Task} from './task';
import {inject} from 'aurelia-framework';
import {Globals} from '../globals';
import {EventAggregator} from 'aurelia-event-aggregator';


@customAttribute('bubble-custom')
@inject(Task, Globals, EventAggregator)
export class BubbleCustomAttribute {


  bubbleEl = null;

  constructor(Task, Globals, EventAggregator){
    this.task = Task;
    this.globals = Globals;
    this.events = EventAggregator;
  }

  bind(bindingContext, overridingContext) {
    var self = this;
    self.bubbleEl = bindingContext.bubbleelement;
  }

  attached(){
    var self = this;
    var be = self.bubbleEl;
    self.task.scrollTop = self.task.scrollTop + be.clientHeight;
  }
}



