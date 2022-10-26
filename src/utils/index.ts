export const delay = (time:number = 1000) => {
  return new Promise((resolve)=>{
    const timer = setTimeout(()=>{
        resolve(timer)
      } , time);
});
}
