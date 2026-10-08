export class MediaProviderError extends Error{
  constructor(
    message:string,
    readonly permanent:boolean,
    readonly status?:number
  ){
    super(message);
    this.name="MediaProviderError";
  }
}
