import {inject, bindable, computedFrom} from 'aurelia-framework';
import {DndService} from 'bcx-aurelia-dnd';

@inject(DndService)
export class Box {
  @bindable item;

  isTextarea=false;
  isNumber=false;
  isBoolean=false;
  isText=false;
  isDate=false;
  isLabel=false;
  selected=false;

  constructor(dndService) {
    this.dndService = dndService;
  }

  attached() {
    this.dndService.addSource(this, {noPreview: true});
    switch (this.item.data.DisplayType) {
      case 'bigint':
        this.isNumber = true;
        break;
      case 'int':
        this.isNumber = true;
        break;
      case 'datetime':
        this.isDate = true;
        break;
      case 'bit':
        this.isBoolean = true;
        break;
      case 'label':
        this.isLabel = true;
        break;
      default:
        this.isTextarea = true;
    }
  }

  detached() {
    this.dndService.removeSource(this);
  }

  dndModel() {
    return {
      type: 'moveItem',
      id: this.item.id
    };
  }

  @computedFrom('item', 'item.x', 'item.y', 'item.width', 'item.height', 'item.editing')
  get positionCss() {
    const x = (this.item && this.item.x) || 0;
    const y = (this.item && this.item.y) || 0;
    const width = (this.item && this.item.width) || 0;
    const height = (this.item && this.item.height) || 0;
    const boxCursor = (this.item && this.item.editing) ? "pointer" : "default";

    return {
      left: x + 'px',
      top: y + 'px',
      width: width + 'px',
      height: height + 'px',
      cursor: boxCursor
    };
  }
}
