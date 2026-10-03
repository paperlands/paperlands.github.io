# frozen_string_literal: true
class BidirectionalLinksGenerator < Jekyll::Generator
  # The notes' apparatus: what every note and page is LINKED to, and the graph
  # the note layout draws (site.data.notes_graph, in memory).
  #
  # THE BRACKETS ARE NOT THIS FILE'S. `[[a note|label]]` is resolved by
  # SiteMarkup (_plugins/site_markup.rb), because a letter's words in
  # _data/contact.yml are written in the same grammar and must not get a second
  # implementation of it. What is left here is the half only a generator can
  # do: walk the documents before they render.
  def generate(site)
    graph_nodes = []
    graph_edges = []

    all_notes = site.collections['notes'].docs
    all_pages = site.pages

    all_docs = all_notes + all_pages

    # The brackets are resolved by the one resolver the letter also uses —
    # SiteMarkup (_plugins/site_markup.rb). A note's prose and a letter's words
    # in _data/contact.yml are one grammar, so they are one code: the generator
    # walks the DOCUMENTS, which is the half Liquid cannot reach, and the
    # filter resolves a data string at render time.
    all_docs.each do |doc|
      doc.content = SiteMarkup.resolve(site, doc.content)
    end

    # Identify note backlinks and add them to each note
    all_notes.each do |current_note|
      # Nodes: Jekyll
      # A note is never its own backlink. The test below is a substring of the
      # raw content, so a note that merely names its own slug — an asset under
      # assets/…/<slug>/, or a link to its own section — used to match itself,
      # list itself under "Notes mentioning this note", and draw a self-loop in
      # the graph.
      notes_linking_to_current_note = all_notes.filter do |e|
        e != current_note && e.content.include?(current_note.url)
      end

      # Nodes: Graph
      graph_nodes << {
        id: note_id_from_note(current_note),
        path: "#{site.baseurl}#{current_note.url}#{SiteMarkup.link_extension(site)}",
        label: current_note.data['title'],
      } unless current_note.path.include?('_notes/index.html')

      # Edges: Jekyll
      current_note.data['backlinks'] = notes_linking_to_current_note

      # Edges: Graph
      notes_linking_to_current_note.each do |n|
        graph_edges << {
          source: note_id_from_note(n),
          target: note_id_from_note(current_note),
        }
      end
    end

    # THE GRAPH IS DATA, NOT A FILE THIS BUILD WRITES INTO THE SOURCE TREE.
    # It used to be written to `_includes/notes_graph.json` and picked up by
    # `{% include %}` in the note layout. That made a build a writer of source:
    # several agents share this tree, a build could land between another agent's
    # read and write of that file, and the write itself was not atomic — so one
    # builder could render a half-written graph, or overwrite a newer one with an
    # older one. Jekyll renders `site.data` into every template, and a generator
    # runs after the data is read and before anything renders, so the graph can
    # live where all the other data lives and be read as
    # `{{ site.data.notes_graph | jsonify }}`.
    site.data['notes_graph'] = {
      'edges' => graph_edges,
      'nodes' => graph_nodes,
    }
  end

  def note_id_from_note(note)
    note.data['title'].bytes.join
  end
end
