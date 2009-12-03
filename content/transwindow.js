/**********************************
transwindow.js
Original Code by flyson
**********************************/

var wX, wY, mX, mY;
var drag = false;

function dragStart(aEvent){
    drag = true;
}
function dragEnd(aEvent){
    drag = false;
}
function dragMove(aEvent){
    if(drag){
        window.screenX = aEvent.screenX - mX + wX;
        window.screenY = aEvent.screenY - mY + wY;
    }else{
        wX = window.screenX;
        mX = aEvent.screenX;
        wY = window.screenY;
        mY = aEvent.screenY;
    }
}
