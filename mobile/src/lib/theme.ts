import {StyleSheet} from 'react-native';
export const colors={background:'#000000',surface:'#222222',border:'#343434',text:'#fafafa',muted:'#b8b8b8',accent:'#f9aa45',ink:'#20170c',error:'#ff9f96'};
export const tones=[{background:'#e6edfb',text:'#213c5b'},{background:'#f9e8d6',text:'#6d4524'},{background:'#e8e4f5',text:'#493a69'},{background:'#dfece3',text:'#294934'}];
export const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:colors.background},
  content:{padding:16,paddingBottom:28,gap:12,width:'100%',maxWidth:900,alignSelf:'center'},
  title:{fontSize:24,lineHeight:29,fontWeight:'600',color:colors.text},
  heading:{fontSize:18,lineHeight:23,fontWeight:'600',color:colors.text},
  text:{fontSize:14,lineHeight:20,color:colors.text},
  muted:{fontSize:12,lineHeight:18,color:colors.muted},
  label:{fontSize:10,lineHeight:14,letterSpacing:.7,color:colors.muted},
  card:{padding:16,borderRadius:20,backgroundColor:colors.surface,gap:10},
  row:{flexDirection:'row',alignItems:'center',gap:12,flexWrap:'wrap'},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:12},
  input:{backgroundColor:colors.surface,color:colors.text,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:12,fontSize:14,minHeight:50},
  divider:{height:1,backgroundColor:colors.border,marginVertical:4},
});
