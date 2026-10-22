export const homepageVideoCopy={
 eyebrow:'VISTRAH SPOTLIGHT',
 title:'Discover more with VISTRAH',
 description:'Explore services for your business, home and everyday life.',
 action:'Explore services',
};

export const homepageVideos=[
 {id:'vistrah-introduction',src:'/videos/homepage/vistrah-introduction.mp4'},
] as const;

export function nextHomepageVideo(index:number,count:number){
 return count>0?(index+1)%count:0;
}
