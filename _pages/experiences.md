---
layout: folio
look: experiences
permalink: /experiences
title: Math Takes the Stage
author: princeton
nav_tone: dark
heroimgurl: /assets/lib/helios/parallel/creators-smiling.webp
excerpt: Give students a stage to share their mathematical creations, discoveries and stories. Explore symposia, festivals and student-led workshops with PaperLand.

# Page-owned content; the body below is the reading order.
# Rich text uses Markdown, [[page|label]] links, and inline HTML where needed.
# See design/experiences.md for the component contract and extension checks.
skip_label: Skip to ways to share
hero:
  brand: PaperLand
  label: experiences
  heading: Math Takes<br><span>the <em>Stage.</em></span>
  scene: creators
  alt: Two students watching their own mathematical creation, a glowing torus
prelude:
  label: From questions to stories
  paragraphs:
    - Meaning in math begins with asking our own questions.
    - We follow a question, try an idea, and find ourselves somewhere we didn’t expect.
    - And now there’s a story worth sharing.
  invitation: That's when the stage
  focus: brings math to *life.*
possibilities:
  seam:
    lead: And the stage becomes
    experience: ours to imagine.
    forms:
      - {shape: branch, src: /assets/lib/notes/experiences/forms-branch-6de71b4e.webp, width: 640, height: 796}
      - {shape: canopy, src: /assets/lib/notes/experiences/forms-canopy-eaf127b6.webp, width: 640, height: 796}
  items:
    - id: festival
      jump: Festival
      reverse: true
      title: What we cannot *create*<br>we do not *understand*
      gesture: create
      position: 40% bottom
      event: Math Festivals & Carnivals
      clip: festival_scene
      poster: /assets/lib/notes/experiences/festival_scene-462fca3c.webp
      body: Carry art and nature into mathematics. Let a pattern grow into a story, an idea into a small film. <br><br> Create something your way, and let others see it too.
      film:
        label: Watch the festival film
        caption: "From young Gambians: math is alive, and in our hands."
        title: Gambian Mathematics Film Festival
        href: https://www.youtube.com/watch?v=IT7jGh46MPc
        embed: https://www.youtube-nocookie.com/embed/IT7jGh46MPc?autoplay=1&rel=0
        poster: /assets/lib/notes/experiences/festival-in-our-hands.webp
        alt: Festival students sharing a joyful moment, with an illustrated mathematical torus in the light behind them
        width: 960
        height: 540
    - id: symposium
      jump: Symposium
      title: Find your own<br>*Why.*
      gesture: explore
      position: 65% top
      event: Math Symposiums & Hackathons
      clip: symposium_scene
      poster: /assets/lib/notes/experiences/symposium_scene-5c924193.webp
      body: Find a pattern. Ask why. Follow a question down  unmarked paths. <br><br> Invite others to explore along with you and find their own Whys.
    - id: workshops
      jump: Student-led workshops
      reverse: true
      title: By students<br>*for students*
      gesture: lead
      framing: gathering
      position: center
      event: Student-led Workshops & Labs
      clip: workshop_gathering
      poster: /assets/lib/notes/experiences/workshop-gathering-20870a84.webp
      body: Bring people together. Tend to their curiosity and make room for their questions.<br><br>The next idea might be theirs.
support:
  title: Where do we<br><em> begin?</em>
  invitation: Bring an experience to your community.
  offer: >-
    In as few as **3 sessions**, your students could surprise you with the
    mathematical stories they <em class="experiences-offer-life">bring to life!</em>
  practical: We can work together **online**, **in-person**, or both.
  cta: Create your stage with us!
  routes:
    - title: We guide *students.*
      body: Students explore mathematics, create animations and share what they discover.
      image:
        src: /assets/lib/notes/experiences/students-together.webp
        alt: A facilitator and students working through a PaperLand lesson together
        width: 800
        height: 609
    - title: We support *teachers.*
      body: Training, lesson plans and support to lead these experiences in their classrooms.
      image:
        src: /assets/lib/notes/experiences/teacher-training.webp
        alt: Teachers working together during a PaperLand training session
        width: 1400
        height: 1031
planning:
  label: Designing Math Experiences
  title: FAQ
  questions:
    - question: How much preparation is needed?
      answer: Students can prepare their mathematical stories in as few as 3 sessions. We’ll plan the preparation and their stage alongside with you.
    - question: What support does PaperLand provide?
      answer: We provide the PaperLand platform, design and plan the programme with you, and train student leaders or teachers who lead it.
    - question: How does this fit our curriculum?
      answer: Our lessons draw on familiar middle and high school mathematics. Browse our [[lesson-plans|lesson plans]] for starting points. We’ll help you adapt them to your curriculum.
    - question: What devices do we need?
      answer: Any digital device works. Students can work in pairs or groups if there aren’t enough devices for everyone.
finale:
  title: Let’s set your<br>*stage together.*
---

<div class="experiences" id="experiences">
  <a class="experiences-skip internal-link" href="#possibilities">{{ page.skip_label | escape }}</a>
  {% include experiences/overture.html hero=page.hero %}
  {% include experiences/prelude.html prelude=page.prelude %}
  {% include experiences/possibilities.html possibilities=page.possibilities %}
  {% include experiences/support.html support=page.support %}
  {% include experiences/planning.html planning=page.planning %}
  {% include experiences/finale.html finale=page.finale %}
</div>
<script type="module" src="{{ '/assets/js/experiences/stage.mjs' | relative_url }}"></script>
<script type="module" src="{{ '/assets/js/experiences/focus.mjs' | relative_url }}"></script>
