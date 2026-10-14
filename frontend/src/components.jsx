import Markdown from 'react-markdown'

function youtubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

export function Video({ url }) {
  if (!url) return null
  const yt = youtubeId(url)
  if (yt) {
    return (
      <div className="video">
        <iframe
          src={`https://www.youtube.com/embed/${yt}`}
          title="video"
          allow="accelerometer; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  return (
    <div className="video">
      <video src={url} controls preload="metadata" />
    </div>
  )
}

export function LessonContent({ content }) {
  return (
    <div className="markdown">
      <Markdown>{content}</Markdown>
    </div>
  )
}
