/**
 * Created by montymccune on 10/15/18.
 */
import moment from 'moment';

class Block {
  constructor(name){
    this.steps=[];
    this.data =[];
    this.name = name;
    this.cls;
    this.collapsed = false;
    this.icon;
    this.headerCls;
    this.type;
    this.createdAt;
    this.workflowType;
    this.from;
    this.description;
    this.patientId;
  }

  getTime(){
    var m =  moment(this.createdAt);
    return m.format("HH:mm:ss");
  }
}

class BodyData{
  constructor(name){
    this.name = name;
    this.detail;
  }
}

class Step{
  constructor(type){
    this.complete = false;
    this.type = type;
    this.cls = 'btn btn-outline-secondary float-right';
    this.indicatorColor = 'ghostwhite';
  }

  toggleStepState(){
    this.complete = this.complete ? false : true;
    this.cls = this.complete ? 'btn btn-success float-right' : 'btn btn-outline-secondary float-right';
    this.indicatorColor = this.complete ? 'lawngreen' : 'ghostwhite';
  }
}


export class Data {
  constructor(){
  }


  randomName(){
    var lastNames = ['McCune', 'Jenkins', 'Baggins', 'Hersey', 'Black', 'Choncho', 'Kent', 'Wayne'];
    var firstNames = ['Paul', 'Bilbo', 'Jimmy', 'Willy', 'Steve', 'Bingo', 'Bruce', 'Clark', 'Monty', 'Abram'];
    var firstIndex = Math.floor(Math.random() * firstNames.length);
    var lastIndex = Math.floor(Math.random() * lastNames.length);
    return lastNames[lastIndex] + ", " + firstNames[firstIndex];
  }

  createBlock(type, steps){


    var stepTypes = ['Exam', 'Plan', 'HPI', 'DX', 'PX', 'History', 'XRay', 'Lab', 'RX', 'Other'];
    var workflowTypes = ['New Patient', 'Established Patient', 'Follow Up', 'Work Comp', 'Consultation', 'Post Op'];
    //var lastNames = ['McCune', 'Jenkins', 'Baggins', 'Hersey', 'Black', 'Choncho', 'Kent', 'Wayne'];
    //var firstNames = ['Paul', 'Bilbo', 'Jimmy', 'Willy', 'Steve', 'Bingo', 'Bruce', 'Clark', 'Monty', 'Abram'];
    var dummyData = {
      hpi: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
      plan: "posed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).",
      exam: "aking it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of 'de Finibus Bonorum et Malorum' (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very"
    };
    var name;// = type;

    if(type == 'patient'){
      //var firstIndex = Math.floor(Math.random() * firstNames.length);
      //var lastIndex = Math.floor(Math.random() * lastNames.length);
      //name = lastNames[lastIndex] + ", " + firstNames[firstIndex];
      name = this.randomName();
    }

    var b = new Block(name);
    b.createdAt = moment();
    b.type = type;
    b.patientId = "PAT1000000007";

    if(type === "task"){
      b.icon = "fa fa-tasks";
      b.headerCls = 'card-header bg-warning';
      b.from = this.randomName() + ":";
      b.description = "Review this awesome task";
    }else if(type === 'patient'){
      b.icon = "fa fa-user";
      b.headerCls = 'card-header bg-success';

      var tStep = steps.toString();
      tStep = tStep.charAt(2);
      var iSteps = parseInt(tStep);
      for(var i = 0; i < iSteps; i++){
        b.steps.push(new Step(stepTypes[i]));
      }
    }
    else{
      b.icon = "fa fa-comment";
      b.headerCls = 'card-header bg-info';
      b.description = "You want to get lunch today? It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum'";
      b.from = this.randomName() + ":";
    }

    if(type == 'patient'){
      b.workflowType = workflowTypes[Math.floor(Math.random() * workflowTypes.length)];

      var hpi = new BodyData("HPI");
      hpi.detail = dummyData.hpi;

      var plan = new BodyData("Plan");
      plan.detail = dummyData.plan;

      var exam = new BodyData("Exam");
      exam.detail = dummyData.exam;

      b.data.push(hpi);
      b.data.push(plan);
      b.data.push(exam);

    }else{
      var d = new BodyData(type);
      d.detail = b.description;
      b.data.push(d);
    }



    return b;
  }

}
