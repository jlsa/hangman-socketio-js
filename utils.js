/**
 * This method is added so I could remove duplicate letters from the word
 */
Array.prototype.unique = function () {
    var r = new Array();
    loop1:for(var i = 0, n = this.length; i < n; i++)
    {
        for(var x = 0, y = r.length; x < y; x++)
        {
            if(r[x]==this[i])
            {
                continue loop1; // jump to the label 'loop1'
            }
        }
        r[r.length] = this[i];
    }
    return r;
}


/**
 * Compares two arrays and validated if they are equal.
 */
const arraysEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length)
    return false;

  for (let i = arr1.length; i--;) {
    if (arr1[i] !== arr2[i])
      return false;
  }
  return true;
}

module.exports = {
  arraysEqual
}
