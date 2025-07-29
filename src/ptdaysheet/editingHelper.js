
let _isEditing = false;
let _callback = null;

export const setIsEditing = (newValue, callback) => {
  _isEditing = newValue;
  if(newValue === true) {
    _callback = callback;
  } else {
    _callback = null;
  }
};

export const getIsEditing = () => {
  return _isEditing;
};

export const runCallback = () => {
  if(_callback) {
    _callback();
  }
};
