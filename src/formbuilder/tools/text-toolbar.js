import {inject, bindable, observable} from 'aurelia-framework';
import {formhelper} from '../formhelper'
import {Editor} from '../editor'

class Element {
  constructor(tag, style){
    this.tag=tag;
    this.style = style;
    this.innerHtml;
  }
}


@inject(formhelper, Editor)
export class TextToolbar {

  @bindable targetElementId;
  @bindable dndId;
  @bindable item;


  setup=true;
  isInput=false;
  fontsizes=[];
  isBold = false;
  isItalic = false;
  fontFamily;
  @observable fontsize;
  fontsizeChanged(newVal, oldVal){
    if(this.setup || newVal== oldVal)return;
    this.setTagWithStyle("span", "font-size", newVal + "pt");
  }
  hrLineSize=1;
  hrLineStyle='solid';

  inputTypes=['text', 'number', 'date'];
  @observable currentInputType='text';
  textColor='#000000';
  backgroundColor='#000000';

  showDateOption = false;
  isSystemDate = false;

  displayFontfaces=false;

  tagLookupList=[];
  lineHeights=[1,1.5,2,2.5,3];

  currentRange=null;

  textRowHeights=[1, 2, 3, 4, 5, 6, 7, 8];
  enableTextRows=false;
  currentTextRows=null;


  //disableInputType = false;
  enableInputType=true;
  //enableTextSpecificTools = true;

  enableFonts=true;
  enableBold=true;
  enableItalic=true;
  enableColor=true;
  enableBackgroundColor=true;
  enableListItems=true;
  enableIndent=true;
  enableAlignment=true;
  enableLineHeight=true;
  enableStyleErase=true;
  enableHr=false;
  enableTable=false;


  currentInputTypeChanged(newVal, oldVal){
    this.showDateOption = newVal === 'date' ? true : false;
  }

  constructor(formhelper, Editor) {
    this.formhelper = formhelper;
    this.editor = Editor;
  }

  // activate(){
  //   var test = '';
  // }

  createTagLookupList(){
    let self = this;
    var boldEl = new Element("b");
    var italicEl = new Element("i");
    var ulEl = new Element("ul");
    ulEl.innerHtml="<li></li>";
    var olEl = new Element("ol");
    olEl.innerHtml="<li></li>";

    self.tagLookupList.push(boldEl);
    self.tagLookupList.push(italicEl);
    self.tagLookupList.push(ulEl);
    self.tagLookupList.push(olEl);
    self.tagLookupList.push(new Element("span"));
  }

  reset(){
    //this.enableTextSpecificTools=true;

    this.enableFonts=true;
    this.enableBold=true;
    this.enableItalic=true;
    this.enableColor=true;
    this.enableBackgroundColor=true;
    this.enableListItems=true;
    this.enableIndent=true;
    this.enableAlignment=true;
    this.enableLineHeight=true;
    this.enableStyleErase=true;
    this.enableHr=false;
    this.enableTable = false;

    this.isInput=false;
    //this.fontsizes=[];
    this.isBold = false;
    this.isItalic = false;
  
    this.inputTypes=['text', 'date'];
    this.currentInputType='text';
  
    this.enableInputType = true;
    this.enableTextRows=false;
    this.showDateOption = false;
    this.isSystemDate = false;
  
    this.displayFontfaces=false;
    this.setup=true;
  }

  attached() {
    this.reset();

    this.createTagLookupList();

    this.fontFamily = this.formhelper.fonts[0]

    this.fontsizes = this.formhelper.getFontSizePickerArray();
    this.fontsize = this.fontsizes[0].points;

    if(this.item && this.item.toolType == 'CHECKBOX'){
      //stupid hack for preventing HTML on checkbox items from being erased
    }

    if(this.item && this.item.toolType == 'TEXTBOX'){
      this.isInput = true;
      this.enableFonts=false;
      this.enableBold=false;
      this.enableItalic=false;
      this.enableColor = false;
      this.enableBackgroundColor=false;
      this.enableListItems=false;
      this.enableIndent=false;
      //this.enableAlignment=false;
      this.enableLineHeight=false;
      this.enableStyleErase=false;

      this.enableTextRows = true;
      //this.enableHr=true;
      //this.enableInputType = false;
    }

    if(this.item && this.item.toolType == 'HR'){
     // this.enableTextSpecificTools = false;
      this.enableFonts=false;
      this.enableBold=false;
      this.enableItalic=false;
      this.enableColor=false;
      this.enableBackgroundColor=false;
      this.enableListItems=false;
      this.enableIndent=false;
      this.enableAlignment=false;
      this.enableLineHeight=false;
      this.enableStyleErase=false;
      this.enableHr=true;
      this.enableInputType = false;
    }

    if(this.item){
      this.currentInputType = this.item.inputType;
    }

    if(this.item && this.item.dataColumn && this.item.dataColumn.columnName ||
      (this.item && this.item.toolType == 'STATICTEXT')){
      this.enableInputType = false;
    }

    if(this.item && this.item.dataColumn && this.item.dataColumn.isSystemDate){
      this.isSystemDate = this.item.dataColumn.isSystemDate;
    }

    //checkboxes...
    if(this.item && this.item.toolType == 'CHECKBOX'){
      this.enableFonts=true;
      this.enableBold=true;
      this.enableItalic=true;
      this.enableColor=true;
      this.enableBackgroundColor=false;
      this.enableListItems=false;
      this.enableIndent=false;
      this.enableAlignment=true;
      this.enableLineHeight=false;
      this.enableStyleErase=true;
      this.enableHr=false;
      this.enableInputType = false;
    }

    //table
    if(this.item && this.item.toolType == 'MYTABLE'){
      this.enableInputType = false;
      this.enableFonts=false;
      this.enableBold=false;
      this.enableItalic=false;
      this.enableColor=false;
      this.enableBackgroundColor=false;
      this.enableListItems=false;
      this.enableIndent=false;
      this.enableAlignment=false;
      this.enableLineHeight=false;
      this.enableStyleErase=false;
      this.enableHr=false;
      this.enableTable = true;
    }

    if(this.item){
      this.toggleButtons(this.item);
    }

    this.setup=false;
  }

  toggleSystemDate(){
    this.isSystemDate = this.isSystemDate ? false : true;

    var itm = this.editor.getItem();
    if(itm.dataColumn){
      itm.dataColumn.isSystemDate = this.isSystemDate;
    }else{
      // this.addPropertyToData('isSystemDate', this.isSystemDate);
      this.addPropertyToItemData(itm, 'isSystemDate', this.isSystemDate);
    }
    this.editor.updateItem(itm);
  }

  addPropertyToItemData(item, name, value){
    item.data[name] = value;
  }

  toggleSubmenu(menu, e){
    switch(menu){
      case 'input':
        break;
      case 'font':
        this.displayFontfaces=true;
        break;
      case 'size':
        break;
    }
    e.stopPropagation();
  }

  toggleButtons(item){
    //look for bold, italic...
    if(item.html){
      this.isItalic = item.html.indexOf('<i>') > -1 ? true : false;
      this.isBold = item.html.indexOf('<b>') > -1 ? true : false;
      if(!this.isBold){
        this.isBold = item.html.indexOf('font-weight: bold') > -1 ? true : false;
      }
    }
    if(item.style){
      this.isItalic = item.style.indexOf('italic') > -1 ? true : false;
      this.isBold = item.style.indexOf('bold') > -1 ? true : false;
    }
  }



  tagExists(tag){
    var itm = this.editor.getItem();
    var el = document.getElementById(itm.elementId);
    return el.getElementsByTagName(tag);
  }

  findIndentTargetWithRange(range){
    let self = this;
  
    var targetElement = null;
    if(range && range.commonAncestorContainer){
      //check parentNode && firstChild for span...
      if(range.commonAncestorContainer.firstChild &&
          range.commonAncestorContainer.firstChild.nodeName == 'SPAN'){
            targetElement = range.commonAncestorContainer.firstChild;
      }else if(range.commonAncestorContainer.firstChild &&
        range.commonAncestorContainer.firstChild.nodeName == 'LI'){
          targetElement = range.commonAncestorContainer.firstChild;
      }else{
        //get parent...
        targetElement = range.commonAncestorContainer.parentNode;
      }
    }

    return targetElement;
  }

  wrapNewElementWithParentTagHtmlAndProperty(parent, tag, innerHtml, property, propertyValue){
    var tagEl = document.createElement(tag);
    if(property && propertyValue){
      tagEl.style.setProperty(property, propertyValue);
    }
    tagEl.innerHTML = innerHtml;
    parent.innerHTML="";
    parent.append(tagEl);
  }

  calculateIndentWithElement(e, indentOrDedent){
    const indent = 15;
    var currentIndent = 0;
    if(e.style){
      var marginLeft = e.style.getPropertyValue('margin-left');
      if(marginLeft.length > 0){
        //parse number...
        marginLeft = marginLeft.replace('px', '');
        currentIndent = parseInt(marginLeft);
      }
    }
    if(indentOrDedent == 'indent'){
      currentIndent += indent;
    }else{
      currentIndent -= indent;
    }
    return currentIndent;
  }


  tagExistsInRange(tag, range){

    var found = null;

    //search children...
    if(range.commonAncestorContainer && 
        range.commonAncestorContainer.children &&
        range.commonAncestorContainer.children.length > 0){
          found = _.find(range.commonAncestorContainer.children, function(c){return c.nodeName == tag.toUpperCase()});
          if(found){
            return found;
          }
    }
    //search parent...
    if(!found){
      if(range.commonAncestorContainer && 
        range.commonAncestorContainer.parentNode &&
        range.commonAncestorContainer.parentNode.nodeName == tag.toUpperCase()){
          return range.commonAncestorContainer.parentNode;
        }
    }
    //search start container...
    if(!found){
      if(range && range.startContainer && 
        range.startContainer.parentElement &&
        range.startContainer.parentElement.nodeName == tag.toUpperCase()){
        return range.startContainer.parentElement;
      }else{
        return null;
      }
    }
  }

  myGetElementById(id){
    var el = document.getElementById(id);
    if(el){
      if(el.nextSibling && el.nextSibling.contentEditable){
        //this is a checkbox, get label element...
        return el.nextSibling;
      }else{
        return el;
      }
    }
    return null;
  }

  addTag(tag, styleAttribute, styleValue){

    //try get selection...
    var range = this.currentRange;
    if(!range)return;

    // var el = document.getElementById(this.targetElementId);
    var itm = this.editor.getItem();
    var el = this.myGetElementById(itm.elementId);
    //lookup element info...
    var tagToAdd = _.find(this.tagLookupList, function(t){return t.tag == tag});
    if(tagToAdd){
      if(tagToAdd.innerHtml){
        var tagEl = document.createElement(tagToAdd.tag);
        tagEl.innerHTML = tagToAdd.innerHtml;
        tagEl.firstElementChild.innerHTML = el.innerHTML;
        el.innerHTML = "";
        el.append(tagEl);
      }else{
        //add like normal...
         var tagEl = document.createElement(tagToAdd.tag);
        var content = range.extractContents();
        if(styleAttribute && styleValue){
          tagEl.style.setProperty(styleAttribute, styleValue);
        }

        tagEl.appendChild(content);
        range.insertNode(tagEl);
      }
    }
    itm.html = el.innerHTML;
  }


  // addTag(tag, styleAttribute, styleValue){

  //   //try get selection...
  //   var range = this.currentRange;
  //   if(!range)return;

  //   // var el = document.getElementById(this.targetElementId);
  //   var el = this.myGetElementById(this.targetElementId);
  //   //lookup element info...
  //   var tagToAdd = _.find(this.tagLookupList, function(t){return t.tag == tag});
  //   if(tagToAdd){
  //     if(tagToAdd.innerHtml){
  //       var tagEl = document.createElement(tagToAdd.tag);
  //       tagEl.innerHTML = tagToAdd.innerHtml;
  //       tagEl.firstElementChild.innerHTML = el.innerHTML;
  //       el.innerHTML = "";
  //       el.append(tagEl);
  //     }else{
  //       //add like normal...
  //        var tagEl = document.createElement(tagToAdd.tag);
  //       var content = range.extractContents();
  //       if(styleAttribute && styleValue){
  //         tagEl.style.setProperty(styleAttribute, styleValue);
  //       }

  //       tagEl.appendChild(content);
  //       range.insertNode(tagEl);
  //     }
  //   }
  //   this.item.html = el.innerHTML;
  // }


  toggleProperty(tag){
    var itm = this.editor.getItem();
    var el = document.getElementById(itm.elementId);
    switch(tag){
      case 'b':
        if(el.style.fontWeight){
          el.style.removeProperty('font-weight');
          this.isBold = false;
        }else{
          el.style.setProperty('font-weight', 'bold');
          this.isBold = true;
        }
        this.applyStyle(el.style.cssText);
        break;
      case 'i':
        if(el.style.fontStyle){
          el.style.removeProperty('font-style');
          this.isItalic = false;
        }else{
          el.style.setProperty('font-style', 'italic');
          this.isItalic = true;
        }
        this.applyStyle(el.style.cssText);
        break;
    }
  }

  toggleTag(tag){
    let self = this;

    //test getting range...
    // var rng = self.getTargetElementCursorSelection();
    // if(!rng)return;

    var rng = this.currentRange;
    if(!rng)return;

    if(self.isInput){
      self.toggleProperty(tag);
    }else{
      // var exists = self.tagExists(tag);
      var exists = self.tagExistsInRange(tag, rng);
      if(exists){
        //remove tag
        exists.replaceWith(exists.childNodes[0]);
        var itm = this.editor.getItem();
        var el = document.getElementById(itm.elementId);
        itm.html = el.innerHTML;
      }else{
        //add tag
        self.addTag(tag);
      }
    }
  }

  //style = 'indent' OR 'dedent'
  indentDedent(style){
    let self = this;

    var rng = self.currentRange;
    if(!rng)return;

    var target = self.findIndentTargetWithRange(rng);

    if(target.nodeName == 'LI'){
      if(style=='indent'){
        var listParent = target.parentNode;
        var newParentEl = document.createElement(listParent.nodeName);
        newParentEl.appendChild(target);
        rng.insertNode(newParentEl);
      }else{
        //parent LIST...
        var parentList = target.parentNode;
        var grandparentlist = null;
        //we can only dedent IF parentList has grandParent
        //AND grandparent and parent are same type...
        if(parentList.parentNode && 
          parentList.parentNode.nodeName == parentList.nodeName){
          grandparentlist= parentList.parentNode;
        }else{
          return;
        }

        //find position in grandparent...
        var elementToReplace = self.findListItemInGrandparent(target, grandparentlist);

        //add to grandparent...
        if(elementToReplace){
          grandparentlist.insertBefore(target, elementToReplace);
        }else{
          grandparentlist.appendChild(target);
        }

        //remove from parentList...
        //parentList.removeChild(target);

        //check if parent List needs to be removed (emtpy)...
        if(parentList.children.length ==0){
          parentList.remove();
        }
      }
    } else if(target.nodeName == 'SPAN'){
      //apply style to span...
      var margin = self.calculateIndentWithElement(target, style);
      target.style.setProperty('margin-left', margin + "px");
    }else{
      //create new element...
      var margin = self.calculateIndentWithElement(target, style);
      self.wrapNewElementWithParentTagHtmlAndProperty(target, "span", target.innerHTML, 'margin-left', margin + "px");
    }
  }

  findListItemInGrandparent(li, grandparent){
    for(var i = 0; i < grandparent.childNodes.length; i++){
      var child = grandparent.childNodes[i];
      if(child.innerText == li.innerText){
        return child;
      }
    }
    return null;
  }

  setTagWithStyle(tag, attribute, value){
    let self = this;



    // if(self.item.toolType == 'MYTABLE'){
    //   self.updateTableSelectedCellStyle(attribute, value);
    // }else{

    //   //test getting range...
    //   var rng = self.currentRange;
    //   if(!rng)return;

    //   var exists = self.tagExistsInRange(tag, rng);
    //   if(exists){
    //     //update tag...
    //     exists.style.setProperty(attribute, value);
    //     var el = self.myGetElementById(this.targetElementId);
    //     this.item.html = el.innerHTML;
    //   }else{
    //     //add tag
    //     self.addTag(tag, attribute, value);
    //   }

    // }
  








    //test getting range...
    var rng = this.currentRange;
    if(!rng)return;

    var exists = self.tagExistsInRange(tag, rng);
    if(exists){
      //update tag...
      exists.style.setProperty(attribute, value);
      var itm = self.editor.getItem();
      var el = self.myGetElementById(itm.elementId);
      itm.html = el.innerHTML;
      // var el = self.myGetElementById(this.targetElementId);
      // this.item.html = el.innerHTML;
    }else{
      //add tag
      self.addTag(tag, attribute, value);
    }
    
  }

  // getItem(){
  //   if(this.item.toolType == 'MYTABLE'){
  //     var aCell = this.item.data.getSelectedCell();
  //     return aCell == undefined ? this.item : aCell.item;
  //   }else{
  //     return this.item;
  //   }
  // }




  fontSizeClicked(fontsize){
    this.fontsize = fontsize.points;
    this.setTagWithStyle("span", "font-size", this.fontsize + "pt");
  }

  fontfamilyClicked(fontfamily){
    this.setTagWithStyle("span", "font-family", fontfamily);
    this.fontFamily = fontfamily;
  }

  applyStyle(cssText){
    var itm = this.editor.getItem();
    if(!itm.style){
      itm.style="";
    }
    itm.style = cssText; //this.item.style.concat(' ', cssText);
  }

  align(id, mode){
    this.editor.align(id, mode);
  }

  textAlign(alignment){
    var itm = this.editor.getItem();
    if(itm.toolType == 'MYTABLE'){
      this.textAlignTable(alignment);
    }else{
      var el = document.getElementById(itm.elementId);
      el.style.setProperty('text-align', alignment);
      this.applyStyle(el.style.cssText);
    }
  }

  textAlignTable(alignment){
    this.updateTableSelectedCellStyle('text-align', alignment);
  }

  updateTableSelectedCellStyle(name, value){
    var itm = this.editor.getItem();
    var tableObj = itm.data;
    var selectedCell = tableObj.getSelectedCell();
    var aStyle = selectedCell.getStyle(name);
    if(aStyle){
      //update
      aStyle.value = value;
      selectedCell.updateStyle(aStyle);
    }else{
      //add
      selectedCell.addStyle(name, value);
    }
  }


  inputTypeClicked(type){
    var itm = this.editor.getItem();
    itm.inputType = type;
    //this.editor.updateItem(itm);
    this.currentInputType = type;
  }

  textRowHeightClicked(rows){
    var itm = this.editor.getItem();
    itm.textRows = rows;
    //this.editor.updateItem(itm);
    this.currentTextRows = rows;
  }

  getTargetElementCursorSelection(){
    //this.currentRange = null;//reset range

    //var el = document.getElementById(this.targetElementId);
    const selection = window.getSelection();

    if(selection.baseOffset == 0 && selection.rangeCount == 0 && selection.extentOffset == 0)return null;

    const range = selection.getRangeAt(0);
    //this.currentRange = range;//set range...
    return range;
  }

  updateTextColor(e){
    let self = this;
    self.textColor = e.target.value;

    var itm = this.editor.getItem();
    if(itm.toolType == 'HR'){
      //update line color...
      self.updateHrLineStyle();
    }else{
      self.setTagWithStyle("span", "color", e.target.value);
    }

    e.target.blur();
  }

  updateBackgroundColor(e){
    let self = this;
    self.backgroundColor = e.target.value;
    self.setTagWithStyle("span", "background-color", e.target.value);
  }

  lineHeightClicked(height){
    let self = this;
    self.setTagWithStyle("span", "line-height", height);
  }

  boldClicked(){
    //var itm = this.editor.getItem();
    //this.toggleButtons(itm);
    this.isBold = this.isBold ? false : true;
    var style = this.isBold ? "bold" : "unset";
    this.setTagWithStyle("span", "font-weight", style);
  }

  italicClicked(){
    this.isItalic = this.isItalic ? false : true;
    var style = this.isItalic ? "italic" : "normal";
    this.setTagWithStyle("span", "font-style", style);
  }

  horizontalRuleClicked(){
    let self = this;
    // var rng = this.currentRange;
    // if(!rng)return;

    // var newHr = document.createElement("hr");
    // newHr.style.setProperty('border', `1px solid ${this.textColor}`);
    // rng.commonAncestorContainer.parentNode.appendChild(newHr);
    // this.item.html = rng.commonAncestorContainer.parentNode.innerHTML;

    this.editor.addTextElement(function(newTextItem){
      var el = document.getElementById(newTextItem.elementId);
      el.innerHTML="";
      var newHr = document.createElement("hr");
      newHr.style.setProperty('border', `1px solid ${self.textColor}`);
      //rng.commonAncestorContainer.parentNode.appendChild(newHr);
      newTextItem.html="";
      el.appendChild(newHr);
      newTextItem.html = el.innerHTML;
      //newTextItem.style = newHr.style.cssText;
      self.editor.updateItem(newTextItem);
    });

  }

  // setHrLineColor(color){
  //   this.textColor = color;
  //   var el = document.getElementById(this.targetElementId);
  //   var hrEl = el.firstChild;
  //   hrEl.style.setProperty('border', `${this.hrLineSize}px ${this.hrLineStyle} ${this.textColor}`);
  //   this.item.html = el.innerHTML;
  //   this.editor.updateItem(this.item);
  // }

  // setHrLineSize(size){
  //   this.hrLineSize = size;
  //   var el = document.getElementById(this.targetElementId);
  //   var hrEl = el.firstChild;
  //   hrEl.style.setProperty('border', `${size}px ${this.hrLineStyle} ${this.textColor}`);
  //   this.item.html = el.innerHTML;
  //   this.editor.updateItem(this.item);
  // }

  // setHrLineStyle(style){
  //   this.hrLineStyle = style;
  //   var el = document.getElementById(this.targetElementId);
  //   var hrEl = el.firstChild;

  //   if(style == 'dotted'){
  //     hrEl.style.border="";
  //     hrEl.style.borderTop = `${this.hrLineSize}px ${this.hrLineStyle} ${this.textColor}`;
  //   }else{
  //     hrEl.style.borderTop="";
  //     hrEl.style.setProperty('border', `${this.hrLineSize}px ${this.hrLineStyle} ${this.textColor}`);
  //   }

  //   this.item.html = el.innerHTML;
  //   this.editor.updateItem(this.item);
  // }

  updateHrLineStyle(){
    var itm = this.editor.getItem();
    var el = document.getElementById(itm.elementId);
    var hrEl = el.firstChild;

    if(this.hrLineStyle == 'dotted'){
      hrEl.style.border="";
      hrEl.style.borderTop = `${this.hrLineSize}px ${this.hrLineStyle} ${this.textColor}`;
    }else{
      hrEl.style.borderTop="";
      hrEl.style.setProperty('border', `${this.hrLineSize}px ${this.hrLineStyle} ${this.textColor}`);
    }


    itm.html = el.innerHTML;
    this.editor.updateItem(itm);
  }



  removeStyle(){
    var itm = this.editor.getItem();
    var el = document.getElementById(itm.elementId);
    el.removeAttribute('style');
    //find all tags as well...
    var childEls = el.getElementsByTagName("*");
    while(childEls.length) {
      var parent = childEls[0].parentNode;
      while(childEls[0].firstChild) {
          parent.insertBefore(  childEls[0].firstChild, childEls[0] );
      }
       parent.removeChild( childEls[0] );
    }

    itm.style=null;
  }

}
