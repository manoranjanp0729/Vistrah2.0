export const homepageVideoCopy={
 eyebrow:'PLATFORM OVERVIEW',
 title:'Verified local services & business tools',
 description:'Compare reviewed service providers, browse local video ads, and manage business listings across categories.',
 action:'Explore services',
};

export const homepageVideos=[
 {id:'vistrah-introduction',src:'/videos/homepage/vistrah-introduction.mp4'},
] as const;

export function nextHomepageVideo(index:number,count:number){
 return count>0?(index+1)%count:0;
}
