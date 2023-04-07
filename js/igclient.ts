import lg from './logger'
import { IgApiClient } from 'instagram-private-api';
import { GetURLS, GetCredentials, GetMapString, GetMime, IsVideo,
         FetchFile, ReadFile, usermap, request, FormatVideo, FormatImage} from './util'

interface ErrorName  { Error : string }
interface ClientInfo { Status: string, IGUsers: string }

const post_image_error : ErrorName = { Error: "IGClient::post_image()" }
const login_error      : ErrorName = { Error: "IGClient::login()" }
const vid_path         : string    = 'temp/Formatted.mp4'
const prev_path        : string    = 'temp/preview.jpg'
const client_name      : string    = "Instagram Client"
//----------------------------------
export class IGClient
{
  constructor()
  {
    this.name    = client_name
    this.ig      = new IgApiClient();
    this.ig     != (void 0)
    this.igusers = new Map<string, boolean>()
  }
  //------------------
  public init() : boolean
  {
    return true
  }
  //------------------
  public info() : ClientInfo
  {
    return { Status: `Selected user  ===> "${this.user}"`, IGUsers: GetMapString(this.igusers) }
  }
  //------------------
  public getname() : string
  {
    return this.name
  }
  //------------------
  public async set_user(user: string) : Promise<void>
  {
    const creds = GetCredentials(user)
    if (!creds.validate())
      lg.error('Failed to get credentials')

    this.user = creds.name;
    this.pass = creds.pass
  }
  //------------------
  private async login() : Promise<boolean>
  {
    this.ig.state.generateDevice(this.user)
    try
    {

      // const account = await this.ig.account.login(this.user, this.pass)
      const account = true;
      // lg.info({ username: account.username, id: account.pk })
      if (account && this.igusers.set(this.user, account))
        return true
    }
    catch (e)
    {
      lg.error({ login_error ,e })
    }
    return false
  }
  //------------------
  public async post(req : request) : Promise<boolean>
  {
    this.set_user(req.user)

    if (!this.user || !this.pass)
      throw new Error("Credentials not set")

    if (!this.igusers.has(this.user) && !await this.login())
      return false
    lg.info("We got this far!")
    if (!req.urls)
      throw new Error("Must provide media")

    if (this.igusers.has(this.user))
    {
      lg.info("Getting URLs")
      const urls  : Array<string> = GetURLS(req.urls)
      lg.info(urls)
      let isVideo : boolean       = false
      let i       : number        = 0
      for (; i < urls.length; i++)
      {
        if (IsVideo(GetMime(urls[i])))
        {
          isVideo = true
          break
        }
      }
      lg.info("Is video?")
      if (isVideo)
        return await this.do_post(req.text, urls[i], true)
      else
        return await this.do_post(req.text, await FetchFile(urls[0]), false)
    }
    throw Error("Failed to login and set user")
  }
  //------------------
  private async do_post(caption : string, file_path : string, is_video : boolean) : Promise<boolean>
  {
    if (!file_path)
      throw Error("Cannot post without media");
    lg.info({is_video})
    if (is_video)
      return (await FormatVideo(file_path) && await this.post_video(caption, file_path))
    else
      return await this.post_image(caption, file_path)
  }
  //------------------
  private async post_video(caption : string, file_path : string) : Promise<boolean>
  {
    const video   = await ReadFile(vid_path)
    const preview = await ReadFile(prev_path)
    try
    {
      return (video && preview &&
              (await this.ig.publish.video({video, coverImage: preview, caption}) != undefined))
    }
    catch (e)
    {
      lg.error({ Error: "post_video", Exception: e })
      throw e
    }
  }
  //------------------
  private async post_image(caption : string, file_path : string) : Promise<boolean>
  {
    lg.info("will format")
    const image_path = await FormatImage(file_path)
    lg.info("Image path points to formatted image")
    const file       = await ReadFile   (image_path)
    if (file)
      try
      {
        // return (await this.ig.publish.photo({file, caption}) != undefined)
        return true;
      }
      catch(e)
      {
        lg.error({ post_image_error, e })
      }
    else
      lg.error({ Error: "No media" })
    return false
  }

  private name    : string
  private user    : string
  private pass    : string
  private ig      : IgApiClient
  private igusers : usermap
}
