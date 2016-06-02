//something to draw to
//constructor will take in canvas, will store context, will have a player associated, settings for where to scroll to etc

function Screen(canvasElement, target, othertarget){
	this.canvasElement = canvasElement;
	this.context = canvasElement.getContext('2d');
	this.target = target;
	this.othertarget = othertarget;
	this.width = canvasElement.width;
	this.height = canvasElement.height;
	this.scroll_max_x = canvas2.width - this.width;
	this.scroll_max_y = canvas2.height - this.height;
	this.is2ndScreen = ( target.id == 1 ) ? true:false;
}
Screen.joiningActive = false;	//class variable
Screen.verticalsplitActive = false;
Screen.horizontalsplitActive = false;
Screen.prototype.setTarget = function(target){
	this.target = target;
}
Screen.prototype.render = function(){
	var sc_w = this.width;
	var sc_h = this.height;
	var scroll_max_x = this.scroll_max_x;
	var scroll_max_y = this.scroll_max_y;
	
	var target = this.target;
	var othertarget = this.othertarget;
	
	var ctx = this.context;
	
	var joiningApart = 1;
	
	//this should be moved out of screen.js since should only calculate once per player per frame.
	target.interp_x = target.x - target.vx*interpFactor;
	target.interp_y = target.y - target.vy*interpFactor;
	othertarget.interp_x = othertarget.x - othertarget.vx*interpFactor;
	othertarget.interp_y = othertarget.y - othertarget.vy*interpFactor;
	
	
	//note using scrl_x,y instead of scroll since still wish to set global variable for bomb, explosion drawing for now.
	var scrl_x = Math.min( Math.max( target.interp_x - (sc_w/2) , 0 ) , scroll_max_x );
	var scrl_y = Math.min( Math.max( target.interp_y - (sc_h/2) , 0 ) , scroll_max_y ); // centre cursor, but don't scroll beyond 
	
	//note that this code is repeated for each view which is a little inefficient. possibly should pull out
	if (Screen.joiningActive){
		//custom joining splitscreen logic
		//might be nicer to reassign "target" player so top player remains target of top screen etc
		//also might be better to have some toptarget, bottomtarget variable that points to the different players.
		var yTop = Math.min(target.interp_y, othertarget.interp_y) - sc_h/2;	//the TOP of the top screen
		var yBottom = Math.max(target.interp_y, othertarget.interp_y) - sc_h/2;  //the TOP of the bottom screen

		//should apply logic to limit position within arena (same as for other screen types)
		yTop = Math.min( Math.max( yTop , 0 ) , scroll_max_y- sc_h );
		yBottom = Math.min( Math.max( yBottom , sc_h ) , scroll_max_y );
		
		//now apply logic to separate screens
		if (yBottom - yTop <= sc_h){
			var total = yBottom + yTop;
			yTop = ( total - sc_h ) /2;
			yBottom = ( total + sc_h) /2;
			
			//joiningCrossover = Math.max( (sc_h - (yBottom - yTop) * 0.02) , 1);	//goes from 0 when not/just touching, to max 1 when crossed over and have to be pushed apart. pos
			joiningApart = 0;
		} 
		
		scrl_y = (this.is2ndScreen == false) ? yTop : yBottom;
	}
	
	var bgShift =0;
	if (Screen.joiningActive){
		bgShift = (this.is2ndScreen == false) ? -21:21;	//672/16
	}
	
	ctx.drawImage(assetManager.asset.BG, (2048-sc_w)/32 + scrl_x/16, (2048-sc_h)/32 + scrl_y/16 +bgShift, 
		sc_w/8 ,sc_h/8,
		0,0, sc_w,sc_h);
		//note this does not centre view - ends up on the left, for	images taller than wide.
	
	
	ctx.drawImage(canvas2, scrl_x,scrl_y, sc_w,sc_h,
                                        0,0, sc_w, sc_h);	//copy from relevant part of destructible canvas, given scroll value to on-screen canvas 
	if (canvas2i){
		ctx.drawImage(canvas2i, scrl_x,scrl_y, sc_w,sc_h,
                                        0,0, sc_w, sc_h);	//same for indestructible part (this is a temporary, inefficient solution!)
	}
	
	
	//draw triangle for spaceships
	var targetArr = [target, othertarget];
	for (i in targetArr){
		targetNow = targetArr[i];
		
		var coldatapix= ~~targetNow.x  + LEVEL_WIDTH*~~targetNow.y;	//might fail if outside of bounds
		//console.log(".. " + coldatapix + ".." + collisionData[coldatapix]);
		
		ctx.fillStyle = ( collisionData8View[coldatapix]==1 ? "rgba(255,0,0,1)" : "rgba(255,255,255,1)");	//red or white
		ctx.fillRect(targetNow.interp_x-scrl_x-5,targetNow.interp_y -scrl_y-5,10, 10);
		
		ctx.fillStyle = ( getCollisionPixelData(coldatapix)==1 ? "rgba(255,0,0,1)" : "rgba(255,255,255,1)");	//red or white
		ctx.fillRect(targetNow.interp_x-scrl_x-3,targetNow.interp_y -scrl_y-3,10, 10);
		
		//ctx.fillStyle = "rgba(255,0,255,1)";	//magenta  //indicate on the whole level canvas at top of screen where scrolled to
		//ctx.fillRect(cursor_x-5,scrl-5,10, 10);
		
		ctx.strokeStyle = rocketColour;
		ctx.fillStyle = rocketColour;
		ctx.beginPath();
		var backx = targetNow.interp_x-scrl_x - gunLength*0.4*targetNow.sinAng;
		var backy = targetNow.interp_y-scrl_y + gunLength*0.4*targetNow.cosAng;
		ctx.moveTo(targetNow.interp_x-scrl_x + gunLength*targetNow.sinAng , targetNow.interp_y-scrl_y - gunLength*targetNow.cosAng);
		ctx.lineTo(backx + gunLength*0.6*targetNow.cosAng , backy + gunLength*0.6*targetNow.sinAng);
		ctx.lineTo(backx + gunLength*0.1*targetNow.sinAng, backy - gunLength*0.1*targetNow.cosAng);	//indented back
		ctx.lineTo(backx - gunLength*0.6*targetNow.cosAng , backy - gunLength*0.6*targetNow.sinAng);
		ctx.lineTo(targetNow.interp_x -scrl_x + gunLength*targetNow.sinAng , targetNow.interp_y -scrl_y - gunLength*targetNow.cosAng);
		ctx.fill();
		ctx.stroke();
		
		//draw some line to show normal vector for where spaceship is (to test)
		var sshipNormal = getNormal(~~targetNow.x, ~~targetNow.y);
		ctx.strokeStyle = 'red';
		ctx.beginPath();
		ctx.moveTo(targetNow.x -scrl_x , targetNow.y -scrl_y );
		ctx.lineTo(targetNow.x + sshipNormal.x*100 -scrl_x , targetNow.y + sshipNormal.y*100 -scrl_y );
		ctx.stroke();
	}
		
	//set global screenCtx, scrl_x,y so draw bombs to the right canvas.
	screenCtx = ctx;
	scroll_x = scrl_x;
	scroll_y = scrl_y;
	for (var b in bombs){
		//console.log("processing a bomb in draw loop");
		bombs[b].draw();
	}
	ctx.globalCompositeOperation = "lighter";
	for (var e in explosions){
		explosions[e].draw();
	}
	ctx.globalCompositeOperation = "source-over"; //set back to default
	
	ctx.strokeStyle = 'rgba(0,0,0,'+ joiningApart +')';
	//draw lines to split views
	if (Screen.verticalsplitActive){
		var liney = (this.is2ndScreen) ? 0: this.canvasElement.height;
		ctx.beginPath();
		ctx.moveTo(0,liney);
		ctx.lineTo(this.canvasElement.width, liney);
		ctx.stroke();
	}
	if (Screen.horizontalsplitActive){
		var linex = (this.is2ndScreen) ? 0: this.canvasElement.width;
		ctx.beginPath();
		ctx.moveTo(linex, 0);
		ctx.lineTo(linex, this.canvasElement.height);
		ctx.stroke();
	}
	if (!this.is2ndScreen){
		ctx.strokeStyle = 'rgba(0,0,0,0.5)';
		ctx.strokeText( framesRecently.toFixed(1) , 50,50);
	}
}