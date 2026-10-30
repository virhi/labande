// Tout le monde sur la même adresse : labande.pages.dev renvoie vers labande.app.
// Les déploiements de prévisualisation (xxxx.labande.pages.dev) ne sont pas touchés.
const OLD_HOST = 'labande.pages.dev'
const HOST = 'labande.app'

export async function onRequest({ request, next }) {
  const url = new URL(request.url)
  if (url.hostname !== OLD_HOST) return next()
  url.hostname = HOST
  return Response.redirect(url.toString(), 301)
}
