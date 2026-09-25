const assert=require('node:assert/strict');
const {TwinSimulation,crosses}=require('../dist/simulation.js');
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
