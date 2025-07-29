export class KeysValueConverter {
	toView(obj){
		let keys = Reflect.ownKeys(obj);
		let objs = [];
		for(let k of keys){
			objs.push(obj[k]);
		}
		return objs;
		// return Reflect.ownKeys(obj);
	}
}
