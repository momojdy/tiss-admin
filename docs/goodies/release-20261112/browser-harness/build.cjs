const esbuild=require('esbuild'),fs=require('fs'),path=require('path');
const admin=path.resolve(__dirname,'../../../..'),customer=path.resolve(admin,'../tiss_tiss_beta/node_modules');
const stub=`import React from 'react';import {View} from 'react-native';export const useFonts=()=>[true,null];export const loadAsync=async()=>{};export const isLoaded=()=>true;export const getLoadedFonts=()=>[];export const LinearGradient=({children,style})=>React.createElement(View,{style},children);export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});export const SafeAreaProvider=({children})=>children;export const SafeAreaView=View;`;
const plugin={name:'native-preview-boundaries',setup(b){
 b.onResolve({filter:/^react(?:\/.*)?$/},args=>({path:require.resolve(args.path,{paths:[customer]})}));
 b.onResolve({filter:/^(expo-font|expo-linear-gradient|react-native-safe-area-context)$/},args=>({path:args.path,namespace:'preview-stub'}));
 b.onLoad({filter:/.*/,namespace:'preview-stub'},()=>({contents:stub,loader:'jsx',resolveDir:customer}));
 b.onResolve({filter:/^@expo\/vector-icons$/},()=>({path:'icons',namespace:'preview-icons'}));
 b.onLoad({filter:/.*/,namespace:'preview-icons'},()=>({contents:`import React from 'react';export const MaterialCommunityIcons=({name,color,size})=>React.createElement('span',{'aria-label':name,style:{color,fontSize:size}},'◌');`,loader:'jsx',resolveDir:customer}));
 b.onResolve({filter:/^@react-native\/assets-registry\/registry$/},()=>({path:path.join(customer,'react-native-web/dist/modules/AssetRegistry/index.js')}));
 b.onResolve({filter:/^react-native-svg$/},()=>({path:path.join(customer,'react-native-svg/lib/module/ReactNativeSVG.web.js')}));
 b.onResolve({filter:/^react-native$/},()=>({path:'rn',namespace:'rn-web-facade'}));
 b.onLoad({filter:/.*/,namespace:'rn-web-facade'},()=>({contents:`export * from '${customer}/react-native-web/dist/index.js';export const TurboModuleRegistry={get:()=>null,getEnforcing:()=>{throw Error('Native module unavailable in browser test')}};`,loader:'js',resolveDir:customer}));
}};
esbuild.build({entryPoints:[path.join(__dirname,'harness.tsx.txt')],bundle:true,outfile:path.join(__dirname,'app.js'),platform:'browser',format:'iife',jsx:'automatic',nodePaths:[customer],resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],define:{'process.env.NODE_ENV':'"development"','__DEV__':'true','process.env.EXPO_PUBLIC_GOODIES_PROVIDER':'"supabase"'},loader:{'.txt':'tsx','.js':'jsx','.ttf':'file','.png':'file'},plugins:[plugin],logLevel:'warning'}).catch(()=>process.exitCode=1);
