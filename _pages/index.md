---
layout: page
title: Home
id: home
permalink: /
---

<h2 class="hero_text">We design new<br>patterns of <ins>learning</ins></h2>



<div class="our_work">
  <!-- header -->
  <h1 class="landing_header">Our work</h1>

  <div class="landing_work_layout">
    <!-- Project cards -->
    <div class="card">
      <div class="card-body">
        <h4 class="card-title">Project Dojo</h4>
        <!-- <h5 class="card-subtitle">Nice looking subtitle.</h5> -->
        <p class="card-text">We design collaborative learning workshops for programming</p>
      </div>
      <img class="image-bottom" src="/assets/lib/landing/project_dojo.jpg" alt="Card example image">
    </div>

    <!-- Project cards -->
    <div class="card">
      <div class="card-body">
        <h4 class="card-title">Project Optic</h4>
        <p class="card-text">We design interfaces to teach non-technical people how to program robots</p>
      </div>
      <img class="image-bottom" src="/assets/lib/landing/ivansutherland.jpeg" alt="Card example image">
    </div>
  </div>
</div>



<div class="our_why">
  <h1 class="landing_header">Why Paperland?</h1>

  <div class="our_why_content">
    <div>
      <p>Very few companies focus on creating good learning environments. It's just viewed as a necessary rite of passage. Rarely do people take the time to improve the system that got them there.</p>

      <p>We believe that the world would be a better place if the processes we shape and weave illuminates and uplifts the spirit of fellowship and belonging.</p>

      <p>We want to build the tools, the environment, the incentives that will lead to better patterns of teaching for the builders of tomorrow.</p>
    </div>

    <img class="image-bottom" src="/assets/lib/kids.jpg">
  </div>
</div>



<div class="our_blog">
  <h1 class="landing_header">Our blog</h1>

  <ul>
    {% assign recent_notes = site.notes | sort: "last_modified_at_timestamp" | reverse %}
    {% for note in recent_notes limit: 5 %}
      <li>
        {{ note.last_modified_at | date: "%Y-%m-%d" }} — <a class="internal-link" href="{{ site.baseurl }}{{ note.url }}">{{ note.title }}</a>
      </li>
    {% endfor %}
  </ul>

  <!-- <button>read more</button> -->
</div>



<div class="work_with_us">
  <h1 class="landing_header">Work with us</h1>

  <div class="work_with_us_content">
    <div>
      <p>Want to redesign your system from first principles?</p>

      <p>Want to augment your class with better programming tools?</p>

      <p>Want to improve how your technology is communicated to beginners?</p>

      <p>If you have a learning opportunity, we would love to have a chat with you!</p>
    </div>

    <div class="col form-group card">
      <div class="name_inputs">
        <div>
          <label for="paperInputs1">First name *</label>
          <input type="text" placeholder="Alan" id="paperInputs1">
        </div>

        <div>
          <label for="paperInputs2">Last name *</label>
          <input type="text" placeholder="Kay" id="paperInputs2">
        </div>
      </div>

      <label for="paperInputs3">Company name *</label>
      <input class="text" type="text" placeholder="Paperland pte ltd" id="paperInputs3">
    
      <label for="large-input">Your message *</label>
      <textarea id="large-input" placeholder="Large input"></textarea>

      <button class="submit_button">Submit</button>
    </div>
  </div>
</div>




<style>
  .hero_text {
    text-align: center;
    padding: 10%; 
  }

  .landing_header {
    text-align: center;
  }

  .our_work {
    padding-bottom: 100px; 

    .landing_work_layout {
      display: flex;

      @media (max-width: 640px) {
        flex-direction: column;
      }
    }

    .card {
      margin: 20px;
      width: 50%;
      
      @media (max-width: 640px) {
        width: 90%;
      }
    }
  }

  .our_why {
    padding-bottom: 100px; 
    
    .our_why_content {
      display: flex;

      #div {
        margin: 8px;
      }

      .image-bottom {
        margin: 20px;
      }

      @media (max-width: 640px) {
        flex-direction: column;
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

      @media (max-width: 640px) {
        flex-direction: column;
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
</style>