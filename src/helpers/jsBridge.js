/**
 * Created by tylerjones on 7/27/16.
 */

import {Aurelia, inject} from 'aurelia-framework';
import {EventAggregator} from 'aurelia-event-aggregator';

@inject(EventAggregator)
export class JsBridge {

  constructor(eventAggregator) {
    let self = this;
    eventAggregator.subscribe('open-pdf', (data) => {
      self.openPdf(data);
    });
  }

  openPdf(pdfPath) {
    console.log('OPEN PDF!', pdfPath);
    if (typeof window.bound !== 'undefined') {
      window.bound.OpenPdf(pdfPath);
    } else {
      console.log("BOUND DOESN'T EXIST!");
    }
  }

  closeCurrentPdf(){
  	var success = false;
	  console.log('CLOSE CURRENT PDF!');
	  if (typeof window.bound !== 'undefined') {
		  success = window.bound.CloseCurrentPdf();
	  } else {
		  console.log("BOUND DOESN'T EXIST!");
	  }
	  return success;
  }
}
