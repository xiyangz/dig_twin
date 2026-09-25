const assert=require('node:assert/strict');
const {TwinSimulation,crosses,crosses3D,BUILDINGS,BASES}=require('../dist/simulation.js');
for(const base of BASES){const roof=BUILDINGS[base.building];assert(base.x>roof.x&&base.x<roof.x+roof.w);assert(base.y>roof.y&&base.y<roof.y+roof.d);assert(base.baseZ>=roof.h&&base.z>base.baseZ);assert(!crosses3D(base,{x:base.x+150,y:base.y,z:base.z},roof),'An elevated ray does not intersect its own roof');assert(crosses3D(base,{x:base.x,y:base.y,z:2},roof),'Downward indoor link enters the building');}
for(const scenario of ['campus','shadow','hotspot','indoor']){
 const s=new TwinSimulation({scenario}),indoor=s.users.filter(u=>u.environment==='indoor');assert.equal(indoor.length,4);assert.equal(indoor.filter(u=>u.speed>0).length,2);
 const starts=indoor.map(u=>({x:u.x,y:u.y}));s.updatePositions(7);
 indoor.forEach((u,i)=>{const b=BUILDINGS[u.building];assert(u.x>b.x&&u.x<b.x+b.w&&u.y>b.y&&u.y<b.y+b.d&&u.z>0&&u.z<b.h);if(u.speed)assert.notDeepEqual({x:u.x,y:u.y},starts[i]);else assert.deepEqual({x:u.x,y:u.y},starts[i]);const shadow=s.channel(u.x,u.y,u.cell,u.z,u.building);s.config.blockage=false;const clear=s.channel(u.x,u.y,u.cell,u.z,u.building);assert(shadow.penetrationLoss>=12&&shadow.loss>clear.loss);assert.equal(clear.penetrationLoss,0);s.config.blockage=true;});
 s.config.mobility=false;const frozen=indoor.map(u=>[u.x,u.y,u.z]);s.updatePositions(100);assert.deepEqual(indoor.map(u=>[u.x,u.y,u.z]),frozen);
 const u=indoor[0],path=s.route(u);for(let n=0;n<100;n++){s.config.mobility=true;s.updatePositions(17);assert(u.x>=path[0][0]&&u.x<=path[1][0]&&u.y>=path[0][1]&&u.y<=path[2][1]);}
}
assert(crosses(0,50,100,50,{x:30,y:30,w:40,d:40}));
assert(!crosses(0,0,100,0,{x:30,y:30,w:40,d:40}));
for(const direction of ['DL','UL'])for(const scheduler of ['PF','RR','MAX']){
 const sim=new TwinSimulation({direction,scheduler,load:200});sim.step(8000);
 for(const u of sim.users){
  const accounted=u.queue+u.pending.reduce((n,p)=>n+(p?p.bits:0),0)+u.totalDelivered+u.totalDropped;
  assert(Math.abs(u.totalGenerated-accounted)<.02,`bit conservation ${direction} ${scheduler} ${u.name}`);
  assert(u.queue>=-1e-6&&u.prbs>=0&&u.prbs<=51);
  for(const p of u.pending)if(p)assert(p.round<=4&&p.prbs>0&&p.bits>0);
 }
 for(let c=0;c<2;c++)assert(sim.users.filter(u=>u.cell===c).reduce((n,u)=>n+u.prbs,0)<=51);
 assert(sim.stats.rate>0&&sim.stats.util<=100&&sim.stats.latency>=4);
 console.log(`${direction} ${scheduler}: ${sim.stats.rate.toFixed(2)} Mbps; conservation and resource bounds passed`);
}
const a=new TwinSimulation(),b=new TwinSimulation();a.step(4000);b.step(4000);assert.deepEqual(a.snapshot(),b.snapshot());
const shadow=new TwinSimulation({scenario:'shadow',mobility:false}),clear=new TwinSimulation({scenario:'shadow',blockage:false,mobility:false});assert(shadow.users[0].sinr<clear.users[0].sinr);shadow.step(4000);clear.step(4000);assert(shadow.users[4].efficiency<clear.users[4].efficiency);assert(shadow.users[4].bler>clear.users[4].bler);
const moving=new TwinSimulation({scenario:'shadow'}),start=moving.users[0].y;moving.step(2000);assert.notEqual(moving.users[0].y,start);moving.config.mobility=false;const point={x:moving.users[0].x,y:moving.users[0].y};moving.step(2000);assert.deepEqual({x:moving.users[0].x,y:moving.users[0].y},point);
const low=new TwinSimulation({load:20,mobility:false}),high=new TwinSimulation({load:250,mobility:false});low.step(4000);high.step(4000);assert(high.users.reduce((n,u)=>n+u.queue,0)>low.users.reduce((n,u)=>n+u.queue,0));
a.reset();a.step(1);assert.equal(a.time,.0005);console.log('Determinism, blockage response, mobility freeze, congestion, reset and single-slot stepping passed');
