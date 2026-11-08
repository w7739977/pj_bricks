import test from 'node:test';
import assert from 'node:assert/strict';
import {createRewardedAdGateway,registerRewardedAdsProvider,requestReshuffleReward} from '../dist/game/rewarded-ads.js';
import {createLevelSession} from '../dist/game/level-session.js';
const session=()=>createLevelSession({progress:{currentLevel:15,highestUnlocked:15,levelSeed:123},config:{hints:0,reshuffles:0,rewardedReshuffleLimit:1},createNextSeed:()=>456});
const gatewayFor=show=>createRewardedAdGateway({getProvider:()=>({isAvailable:()=>true,show})});

test('missing or unavailable SDK never offers or fabricates a rewarded ad', async()=>{
 registerRewardedAdsProvider(null);
 const gateway=createRewardedAdGateway();
 assert.equal(gateway.isAvailable(),false);
 assert.deepEqual(await gateway.request({}),{status:'unavailable'});
 assert.throws(()=>registerRewardedAdsProvider({show(){}}),TypeError);
 const asyncAvailability=createRewardedAdGateway({getProvider:()=>({isAvailable:async()=>true})});
 assert.equal(asyncAvailability.isAvailable(),false);
});

test('cancel, close and SDK errors do not award a reshuffle', async()=>{
 for(const show of [async()=>({rewarded:false}),async()=>({closed:true}),async()=>undefined,async()=>{throw Error('no fill');}]){
  const value=session();
  const result=await requestReshuffleReward({gateway:gatewayFor(show),session:value,isCurrent:()=>true,levelNumber:15});
  assert.notEqual(result.status,'rewarded');
  assert.equal(value.snapshot().reshufflesRemaining,0);
  assert.equal(value.snapshot().rewardedReshufflesUsed,0);
 }
});

test('earned reward grants one rescue, and the per-level cap prevents more', async()=>{
 let calls=0;const value=session(),gateway=gatewayFor(async context=>{calls++;assert.equal(context.placement,'deadlock-reshuffle');return {rewarded:true};});
 const request=()=>requestReshuffleReward({gateway,session:value,isCurrent:()=>true,levelNumber:15});
 assert.deepEqual(await request(),{status:'rewarded'});
 assert.equal(value.snapshot().reshufflesRemaining,1);
 assert.deepEqual(await request(),{status:'limit'});
 assert.equal(value.snapshot().reshufflesRemaining,1);
 assert.equal(calls,1,'never show an ad when no reward can be granted');
});

test('concurrent requests show one ad and a late reward cannot modify a replaced level', async()=>{
 let finish,calls=0,current=true;
 const value=session(),gateway=gatewayFor(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
 const pending=requestReshuffleReward({gateway,session:value,isCurrent:()=>current,levelNumber:15});
 assert.equal(gateway.isAvailable(),false);
 assert.deepEqual(await gateway.request({}),{status:'busy'});
 current=false;finish({rewarded:true});
 assert.deepEqual(await pending,{status:'stale'});
 assert.equal(value.snapshot().reshufflesRemaining,0);
 assert.equal(calls,1);
 assert.equal(gateway.isAvailable(),true);
});
