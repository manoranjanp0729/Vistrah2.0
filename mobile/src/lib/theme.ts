import {StyleSheet} from 'react-native';
export const colors={background:'#000000',surface:'#222222',border:'#343434',text:'#fafafa',muted:'#b8b8b8',accent:'#f9aa45',ink:'#20170c',error:'#ff9f96'};
export const tones=[{background:'#e6edfb',text:'#213c5b'},{background:'#f9e8d6',text:'#6d4524'},{background:'#e8e4f5',text:'#493a69'},{background:'#dfece3',text:'#294934'}];
export const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:colors.background},
  content:{padding:20,paddingBottom:40,gap:20,width:'100%',maxWidth:900,alignSelf:'center'},
  title:{fontSize:30,fontWeight:'600',color:colors.text},
  heading:{fontSize:23,fontWeight:'600',color:colors.text},
  text:{fontSize:16,lineHeight:25,color:colors.text},
  muted:{fontSize:14,lineHeight:22,color:colors.muted},
  label:{fontSize:12,letterSpacing:1,color:colors.muted},
  card:{padding:22,borderRadius:24,backgroundColor:colors.surface,gap:14},
  row:{flexDirection:'row',alignItems:'center',gap:12,flexWrap:'wrap'},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:12},
  input:{backgroundColor:colors.surface,color:colors.text,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:14,fontSize:16,minHeight:50},
  divider:{height:1,backgroundColor:colors.border,marginVertical:4},
});
