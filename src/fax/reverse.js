
export class ReverseValueConverter {
	toView(array){
		return array ? array.slice().reverse() : null;
	}
}