---
layout: page
title: Home
id: home
permalink: /
---
<div class="hero_text">
  <h1>Paperland.</h1>
  <div>
    <h3>designing new patterns of <span class="fancy">Learning!</span></h3>
  </div>
</div>

<section class="projects" id="projects">
  <!-- header -->
  <h2 class="landing_header">Projects</h2>

  <div class="projects_layout">
    <!-- Project cards -->
    {% include card.html
      title="Workhop Dojo"
      description="We design workshops to help students discover the JOY of computation"
      image_path="/assets/lib/landing/wan_workshop_16x9.jpg"
      image_alt="Project Dojo students interacting with collaborative learning medium"
      href="/dojo" %}
    
    {% include card.html 
      title="Project Optic"
      description="We design INTUITIVE robotic interfaces for your non-techical folks!"
      image_path="/assets/lib/landing/ivansutherland.jpeg"
      image_alt="Sutherland on Sketchpad" 
      href="/" %}

  </div>
</section>



<section class="our_why">
  <h2 class="landing_header">Why Paperland?</h2>

  <div class="our_why_content">
    <div>
      <p>We believe that the world would be a better place if the processes we shape and weave illuminates and uplifts the spirit of fellowship and belonging.</p>

      <p>We want to build the tools, the environment, the incentives that will lead to better patterns of teaching for the builders of tomorrow.</p>
    </div>

    <img src="/assets/lib/landing/castle_sun_1x1.png">
  </div>
</section>



<section class="our_blog" id="blog">
  <h2 class="landing_header">Our blog</h2>

  <ul>
    {% assign recent_notes = site.notes | sort: "last_modified_at_timestamp" | reverse %}
    {% for note in recent_notes limit: 5 %}
      <li>
        {{ note.last_date | date: "%Y-%m-%d" }} — <a class="internal-link" href="{{ site.baseurl }}{{ note.url }}" data-tooltip="true">{{ note.title }}</a>
      </li>
    {% endfor %}
  </ul>

  <!-- <button>read more</button> -->
</section>



<section class="work_with_us" id="contact">
  <h2 class="landing_header">Work with us</h2>

  <div class="work_with_us_content">
    <div class="padding-right-large work_with_us_content_el_1">
      <p>Want to redesign your system from first principles?</p>

      <p>Want to augment your class with better programming tools?</p>

      <p>Want to improve how your technology is communicated to beginners?</p>

      <p>If you have a learning opportunity, we would love to have a chat with you!</p>
    </div>
    
    <form id="paper_form" class="col form-group card work_with_us_content_el_2" accept-charset="UTF-8" action="https://india.fly.dev/proxy/apps/guru/work" method="POST">
      <label for="name-input">Your Name *</label>
      <input id="name-input" type="text" name="name" placeholder="Alan Kay">

      <label for="email-input">Email *</label>
      <input id="email-input" type="email" name="email" placeholder="alan@paperland.in">

      <label for="company-input">Company/Org</label>
      <input id="company-input" type="text" name="company" placeholder="Xerox Parc">
      
      <label for="message-input">Your message *</label>
      <textarea id="message-input" name="message" rows="4" placeholder="There are more contexts than the one that we're in — the one that we think is reality"></textarea>
      
      <input type="hidden" name="return_url" value="{{ page.url | absolute_url }}">
      <span> &nbsp;  </span>
      <div class="h-captcha card" data-sitekey="7688737e-8d00-4c1e-acdc-828ee1c02e08"></div>
      <script src="https://js.hcaptcha.com/1/api.js" async defer></script>
      <span> &nbsp;  </span>
      <button type="submit">Submit</button>

    </form>
  </div>
  <div class="toast" id="toast-good">
    <i class="fa fa-check-circle"></i>
    <input class="alert-state" id="toast-alert" type="checkbox">

    <div class="alert alert-muted dismissible">
      Sent! To the desks <a class="internal-link" href="/about"> <b>@paperland</b></a>
      <label class="btn-close" for="toast-alert">X</label>
    </div>
  </div>
  
  <div class="toast" id="toast-bad">
    <i class="fa fa-check-circle"></i>
    <input class="alert-state" id="toast-alert" type="checkbox">

    <div class="alert alert-danger dismissible">
      Check the I am human checkbox!
      <label class="btn-close" for="toast-alert">X</label>
    </div>
  </div>
</section>




<style>
  h1 {
    font-weight: bold;
    font-size: 9em;
    @media (max-width: 768px) {
      font-size: 4em;
    }
  }

  section {
    padding-top: 10vh;
    padding-bottom: 10vh;
  }
  
  .hero_text {
    text-align: center;
    margin: 22vh 0 10vh;
    @media (max-width: 768px) {
      margin: 25vh 0 5vh;
    }

    div {
      margin: 0 3vw 0
    }
  }

  .fancy {
    position: relative;
    white-space: nowrap;
    &:after {
      --deco-height: 0.3125em;
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: calc(var(--deco-height) * -0.625);
      height: var(--deco-height);
      background-image: url("data:image/svg+xml,%3Csvg width='100' height='64' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23a)'%3E%3Cpath d='M-17 30.5C-1 22 72-4 54 13 37.9 28.2-2.5 57.5 16 55.5s72-29 104-40' stroke='%23000000' stroke-width='10'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='a'%3E%3Cpath fill='%23fff' d='M0 0h100v64H0z'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E%0A");
      background-size: auto 100%;
      background-repeat: round;
      background-position: 0em;
    }
  }
  body.night-mode {
    .fancy {
      position: relative;
      white-space: nowrap;
      &:after {
        --deco-height: 0.3125em;
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        bottom: calc(var(--deco-height) * -0.625);
        height: var(--deco-height);
        background-image: url("data:image/svg+xml,%3Csvg width='100' height='64' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23a)'%3E%3Cpath d='M-17 30.5C-1 22 72-4 54 13 37.9 28.2-2.5 57.5 16 55.5s72-29 104-40' stroke='%23cccccc' stroke-width='10'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='a'%3E%3Cpath fill='%23fff' d='M0 0h100v64H0z'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E%0A");
        background-size: auto 100%;
        background-repeat: round;
        background-position: 0em;
      }
    }
  }

  .landing_header {
    text-align: center;
  }

  .projects .projects_layout {
    display: flex;
    @media (max-width: 640px) {
      flex-direction: column;
    }
  }

  body.night-mode {
    .projects {
      .card {
        .card-text {
          color: #ccc; 
        }
      }
    }
  }

  .our_why {
    padding-left: 20%; 
    padding-right: 20%; 
    @media (max-width: 1048px) {
      padding-left: 5%; 
      padding-right: 5%; 
    }
    
    .our_why_content {
      display: flex;
      @media (max-width: 768px) {
        flex-direction: column;
      }

      div {
        margin: 0 5%;
        @media (max-width: 768px) {
          margin: 0;
        }
      }

      img {
        width: 20vw;
        height: 20vw;
        @media (max-width: 768px) {
          width: 100vw;
          height: auto;
        }
      }

    }
  }

  .our_blog {
    padding-bottom: 100px; 
  }

  .work_with_us {
    padding-bottom: 100px;
    
    .work_with_us_content {
      display: flex;
      justify-content: center;

      @media (max-width: 768px) {
        flex-direction: column;
      }

      .work_with_us_content_el_1 {
        flex-basis: 60%;
      }
      .work_with_us_content_el_2 {
        flex-basis: 40%;
        
        label {
          margin-bottom: 0;
          margin-top: 10px;
        }
      }
    }

    .name_inputs {
      display: flex;
      justify-content: space-between;
    }

    .submit_button {
      margin: 1rem;
    }
  }
  
  .toast {
    position: fixed;
    bottom: 20px;
    right: 0vh;
    transform: translateX(-50%);
    padding: 10px 20px;
    z-index: 9999;
    opacity: 0;
    visibility: hidden;
    display: none;
    animation: fade-in 10s ease-in-out forwards;
  }

  @keyframes fade-in {
    0% {
      opacity: 0;
      visibility: visible;
      transform: translateX(-50%) translateY(20px);
    }
    15% {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }
    
    90% {
      opacity: 0;
      visibility: hidden;
      transform: translateX(-50%) translateY(0);
    }
    
    100% {
      opacity: 0;
      display: none;
      transform: translateX(-50%) translateY(0);
    }
  }
</style>

<script>

  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('sent') == "true"){
   const element = document.getElementById('toast-good');
   element.style.display = 'block'; // Show the element
   }
    else if (urlParams.get('sent') == "false") {
    const element = document.getElementById('toast-bad');
    element.style.display = 'block'; // Show the element
    }
  


</script>


