export class printHelper{

  constructor(){
    console.log("PRINT HELPER");
  }

  hideFromPrintClass = "pe-no-print";
  preservePrintClass = "pe-preserve-print";
  preserveAncestorClass = "pe-preserve-ancestor";
  bodyElementName = "BODY";

  _hide (element) {
      if (!element.classList.contains(this.preservePrintClass)) {
          element.classList.add(this.hideFromPrintClass);
      }
  };

  _preserve (element, isStartingElement) {
      element.classList.remove(this.hideFromPrintClass);
      element.classList.add(this.preservePrintClass);
      if (!isStartingElement) {
          element.classList.add(this.preserveAncestorClass);
      }
  };

  _clean (element) {
      element.classList.remove(this.hideFromPrintClass);
      element.classList.remove(this.preservePrintClass);
      element.classList.remove(this.preserveAncestorClass);
  };

  _walkSiblings (element, callback) {
      var sibling = element.previousElementSibling;
      while (sibling) {
          callback(sibling);
          sibling = sibling.previousElementSibling;
      }
      sibling = element.nextElementSibling;
      while (sibling) {
          callback(sibling);
          sibling = sibling.nextElementSibling;
      }
  };

  _attachPrintClasses (element, isStartingElement) {
    let self = this;
    self._preserve(element, isStartingElement);
    self._walkSiblings(element, self._hide.bind(self));
  };

  _cleanup (element, isStartingElement) {
    let self = this;
    self._clean(element);
    self._walkSiblings(element, self._clean.bind(self));
  };

  _walkTree(element, callback) {
      var currentElement = element;
      callback(currentElement, true);
      currentElement = currentElement.parentElement;
      while (currentElement && currentElement.nodeName !== this.bodyElementName) {
          callback(currentElement, false);
          currentElement = currentElement.parentElement;
      }
  };

  _print(elements) {
    let self = this;
      for (var i = 0; i < elements.length; i++) {
        self._walkTree(elements[i], self._attachPrintClasses.bind(self));
      }
      window.print();
      for (i = 0; i < elements.length; i++) {
        self._walkTree(elements[i], self._cleanup.bind(self));
      }
  };

}
