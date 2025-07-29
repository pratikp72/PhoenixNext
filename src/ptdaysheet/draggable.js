import { customAttribute, inject, TaskQueue } from 'aurelia-framework';
import Hammer from 'hammerjs';

@customAttribute('draggable')
@inject(Element)
export class Draggable {
  constructor(element){
    this.element = element;
  }

  attached(){
    console.log('attached draggable')
    console.log(document.Hammer)
    const manager = new Hammer.Manager(this.element);//.querySelector('.daysheet-timer'));
    manager.add(new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 0 }));
    manager.on('pan', e => this.pan(e));
  }

  pan(e){
    // if there is no top set, dialog is still positioned relative
    if(!this.element.style.top){
      const {x,y} = this.element.getBoundingClientRect();
      this.element.style.top = y +'px'
      this.element.style.left = x +'px'
      this.element.style.marginTop = '0';
      this.element.style.position = 'absolute';
    } else {
      const top = parseFloat(this.element.style.top.replace(/px/, ''))
      const left = parseFloat(this.element.style.left.replace(/px/, ''))

      this.element.style.top = (top + e.srcEvent.movementY) +'px';
      this.element.style.left = (left + e.srcEvent.movementX) +'px';
    }
  }
}
