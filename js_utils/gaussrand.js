function gaussRand(){
	//note currently generally becomes bigger as increase numTimes. (maybe should divide by sqrt(numtimes?))
	var sqrtNumTimes = 2;
	var numTimes = sqrtNumTimes*sqrtNumTimes;
	var total = -numTimes/2;
	for (var ii=0;ii<numTimes;ii++){
		total+=Math.random();
	}
	return total/sqrtNumTimes;
}

//this is inefficent to run every time.
//TODO precalc some number (eg 256) of random numbers. keep in array. cycle through array, returning a random number each time.