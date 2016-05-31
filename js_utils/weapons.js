"use strict";

var thingListMaker = function generateThing(thingClass){
	var thingObj = {};
	thingObj.byName = {};
	
	thingObj.add = function(){
		for(var t = 0; t < arguments.length; t++){
			var thisThing = arguments[t];
			if (thisThing.name){
				thingObj.byName[thisThing.name] = new thingClass(thisThing);
			}
		}
	}
	thingObj.print = function(){
		console.log("weapons array : " + JSON.stringify(thingObj));
	}
	//lots of variables eventually
	//should cover things like spread shots, randomness, waves
	//cluster bombs should be covered by weapons system somehow - eg a shot exploding is like firing a "weapon"

	return thingObj;
}

//same idea as _set_stype from gfx.dba
function Shot( configObj ){
	this.damage = configObj["damage"] | 0;
	this.mass = configObj["mass"] | 1;
	this.wall_mode = configObj["wall_mode"] | 0;
	this.prox_mode = configObj["prox_mode"] | 0;
	this.radius = configObj["radius"] | 0;
	this.timer = configObj["timer"] | 300;
	this.kinetic_mode = configObj["kinetic_mode"] | 0;
	this.blast_image = configObj["blast_image"] | 0;
	this.blast_power = configObj["blast_power"] | 0;
	this.exp_size = configObj["exp_size"] | 0;
	this.exp_speed = configObj["exp_speed"] | 0;
	this.exp_type = configObj["exp_type"] | 0;
	this.drag = configObj["drag"] | 0;
	//TODO some way to use constants eg someObject.WALL_MODE_BOUNCE

	//other things? 
	//rotation (eg for bananas)
	//shots that disperse other shots continually? 
}
Shot.WALL_MODE_BOUNCE =0;
Shot.WALL_MODE_EXPLODE =1;

var shotTypes = thingListMaker(Shot);

shotTypes.add({
	'name': 'standard',
	'wall_mode': Shot.WALL_MODE_EXPLODE
	},{
	'name': 'bounce',
	'wall_mode': Shot.WALL_MODE_BOUNCE
});

function Weapon( configObj ){
	this.name = configObj["name"];
	this.shot_type = shotTypes.byName[configObj["shot_type"]];
	this.muz_vel = configObj["muz_vel"] | 0;
	this.fire_interval = configObj["fire_interval"];
	this.spray = configObj.spray | 0;
	this.autofire = (configObj.autofire === undefined) ? true : configObj.autofire;
	this.num_projectiles = configObj.num_projectiles | 1;
}

var weapons = thingListMaker(Weapon);

//adding weapons into the list
weapons.add({
	'name': 'drop',
	'fire_interval': 8,
	'shot_type': 'standard',
},{
	'name':'standard gun',
	'muz_vel': 4,
	'fire_interval': 6,
	'shot_type': 'standard',
	'spray': 1
},{
	'name': 'rear gun',
	'muz_vel': -2,
	'fire_interval': 2,
	'shot_type': 'standard'
},{
	'name': 'fast gun',
	'muz_vel': 16,
	'fire_interval': 4,
	'shot_type': 'standard'
},{
	'name': 'rapid fire gun',
	'muz_vel': 1,
	'fire_interval': 1,
	'shot_type': 'standard'
},{
	'name': 'bounce gun',
	'muz_vel': 1.5,
	'fire_interval': 3,
	'shot_type': 'bounce'
},{
	'name': 'continuous spray',
	'fire_interval': 2,
	'shot_type': 'standard',
	'spray': 10
},{
	'name': 'burst spray',
	'fire_interval': 5,
	'shot_type': 'standard',
	'spray': 10,
	'num_projectiles':10
},{
	'name': 'bouncy burst spray',
	'fire_interval': 8,
	'shot_type': 'standard',
	'spray': 4,
	'num_projectiles':16,
	'shot_type': 'bounce'
},{
	'name': 'semi auto bomb',
	'fire_interval': 20,
	'shot_type': 'standard',
	'autofire':false
});
weapons.print();




