import 'package:flutter/material.dart';

void main()=>runApp(const VistraApp());

class VistraApp extends StatelessWidget{
 const VistraApp({super.key});
 @override Widget build(BuildContext context)=>MaterialApp(
  debugShowCheckedModeBanner:false,title:'Vistra',
  theme:ThemeData(useMaterial3:true,colorSchemeSeed:Colors.indigo),
  home:const HomePage());
}

class HomePage extends StatefulWidget{const HomePage({super.key});@override State<HomePage> createState()=>_HomePageState();}
class _HomePageState extends State<HomePage>{
 final categories=[
  ['💼','Jobs & Careers'],['🏠','Real Estate'],['🏗️','Civil & Construction'],
  ['📣','Digital Marketing'],['🧾','Tax & Compliance'],['💻','IT & Technology'],
  ['🏢','Business Services'],['🛠️','Local & Professional Services']];
 bool drawer=false;
 @override Widget build(BuildContext context)=>Scaffold(
  appBar:AppBar(title:const Text('VISTRA',style:TextStyle(fontWeight:FontWeight.w900,letterSpacing:4)),leading:IconButton(icon:const Icon(Icons.menu),onPressed:()=>setState(()=>drawer=!drawer))),
  body:Stack(children:[
   ListView(padding:const EdgeInsets.all(20),children:[
    const Text('What do you need help with?',style:TextStyle(fontSize:30,fontWeight:FontWeight.bold)),
    const SizedBox(height:8),const Text('Tell Vistra what you need. We help you get it done.'),
    const SizedBox(height:22),TextField(decoration:InputDecoration(hintText:'Search services...',prefixIcon:Icon(Icons.search),border:OutlineInputBorder(borderRadius:BorderRadius.all(Radius.circular(14))))),
    const SizedBox(height:25),const Text('Services',style:TextStyle(fontSize:20,fontWeight:FontWeight.bold)),const SizedBox(height:12),
    ...categories.map((c)=>Card(child:ListTile(leading:Text(c[0],style:const TextStyle(fontSize:28)),title:Text(c[1],style:const TextStyle(fontWeight:FontWeight.bold)),subtitle:const Text('Get started →'),onTap:()=>_openService(c[1])))),
   ]),
   if(drawer)Positioned(left:0,top:0,bottom:0,width:280,child:Material(elevation:8,color:Colors.white,child:ListView(padding:const EdgeInsets.only(top:55),children:[
    const Padding(padding:EdgeInsets.all(20),child:Text('VISTRA',style:TextStyle(fontWeight:FontWeight.w900,fontSize:22,letterSpacing:4))),
    ListTile(leading:const Icon(Icons.person_outline),title:const Text('Profile'),onTap:()=>_info('Profile')),
    ListTile(leading:const Icon(Icons.assignment_outlined),title:const Text('My Applications'),onTap:()=>_info('My Applications')),
    ListTile(leading:const Icon(Icons.card_giftcard),title:const Text('Refer & Earn'),onTap:()=>_info('Refer & Earn — Give 20%, Get 20%')),
    ListTile(leading:const Icon(Icons.info_outline),title:const Text('About Us'),onTap:()=>_info('About Vistra')),
    ListTile(leading:const Icon(Icons.call_outlined),title:const Text('Call Vistra'),onTap:()=>_info('Call Vistra')),
   ])))
  ]));
 void _openService(String name)=>_info('$name requirement form');
 void _info(String s)=>showDialog(context:context,builder:(_)=>AlertDialog(title:const Text('Vistra'),content:Text(s),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Close'))]));
}
