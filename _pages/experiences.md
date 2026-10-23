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
  label: PaperLand experiences
  heading: Math Takes<br><span>the <em>Stage.</em></span>
  scene: creators
  alt: Two students watching their own mathematical creation, a glowing torus
prelude:
  label: From questions to stories
  paragraphs:
    - Meaning in math begins with our own questions.
    - They lead us down unknown paths, with only our curiosity to guide us.
    - And suddenly we are on a quest and, these questions become stories waiting to be shared.
  invitation: That's when the stage
  focus: brings math to *life.*
possibilities:
  seam:
    lead: This Stage can take
    experience: different Shapes
    forms:
      - {shape: branch, src: /assets/lib/notes/experiences/forms-branch-6de71b4e.webp, width: 640, height: 796}
      - {shape: canopy, src: /assets/lib/notes/experiences/forms-canopy-eaf127b6.webp, width: 640, height: 796}
  items:
    - id: festival
      jump: Festival
      reverse: true
      identity: To Create
      invitation: Connections through Arts & Stories
      event: Math Festivals & Carnivals
      title: What I cannot *create* <br>I do not *understand*
      gesture: create
      clip: creators
      caption: Storytelling that brings math to life.
      body: Bridge art and nature through mathematics. Turn a pattern into a story, an idea into a movie. Build something for yourself and suddenly, others can see it too.
      outcome: Mathematics made to be felt.
    - id: symposium
      jump: Symposium
      identity: To Explore
      invitation: Through Inquiry & Discovery
      event: Math Symposiums & Hackathons
      title: Find your own <br>*Why.*
      gesture: explore
      clip: star
      caption: Branching math to nature to an auditorium.
      body: Seek patterns and questions that lead you down your own conjectures. Share them with others and start a conversation few would have thought to have.
      outcome: Mathematics for you to question.
    - id: workshops
      jump: Student-led workshops
      reverse: true
      identity: To Lead
      invitation: In Service of your Community
      event: Peer-led Workshops & Labs
      title: By students <br>*for students*
      gesture: lead
      clip: shell
      caption: Inspiring the next big idea in a group huddle.
      body: Lean in. Bring people together. Tend to their curiosity, make room for their questions. The next idea might be theirs.
      outcome: Nurture our spirit of wonder.
support:
  title: Where do we<br><em> begin?</em>
  offer: In as few as **3 sessions**, your students could surprise you with the mathematical stories they <em class="experiences-offer-life">bring to life!</em>
  practical: Training available **online** and/or **in-person**.
  cta: Begin on your experience!
  routes:
    - title: We train your *students.*
      body: Guided lessons to explore mathematics, create animations and share discoveries.
      image:
        src: /assets/lib/notes/experiences/students-together.webp
        alt: A facilitator and students working through a PaperLand lesson together
        width: 800
        height: 609
    - title: We train your *teachers.*
      body: Training, resources and support to lead PaperLand learning in your classrooms.
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
      answer: Students can bring their mathematical stories to life in as few as 3 sessions. We’ll plan the preparation and sharing around what you wish to achieve.
    - question: What support does PaperLand provide?
      answer: We provide the computational platform, design the programme with you, and train your student leaders or teachers to bring it to life.
    - question: How does this fit our maths curriculum?
      answer: Our lessons build on familiar middle and high school maths topics. Browse our [[lesson-plans|lesson plans]] to see what students can explore. We’ll help you adapt them to your curriculum.
    - question: What do we need?
      answer: Any digital device. If there are not enough to go around, students can work in pairs and groups.
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
