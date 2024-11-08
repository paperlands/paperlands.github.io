---
layout: page
title: Dojo
permalink: /dojo
redirect_from: /turtle
---


<div class="my-18 text-center sm:my-24">
    <h1 class="mb-8 text-6xl tracking-tighter sm:text-9xl">Project Dojo</h1>
    <div class="">We design workshops to discover the joy of computing for all ages</div>
    <div class="my-12">
        <a class="p-4 rounded-md bg-primary" href="https://dojo.paperland.in/">Turtle Demo</a>
    </div>
</div>

{% include dojo_section.html 
    title="School engagement"
    first_image_path="/assets/lib/landing/stpats_discord_bot_workshop_16x9.jpg"
    first_image_alt="Discord Bot Workshop" 
    first_image_caption="Discord Bot Workshop @ St. Patrick's School"
    second_image_path="/assets/lib/landing/ca_workshop_16x9.jpg"
    second_image_alt="Cellular Automaton Workshop" 
    second_image_caption="Computational Thinking Workshop @ Deus Ludum"
    text_top="From wetting your toes with building discord bots for fun ... "
    text_mid=" ... to exploring the mysteries of cellular automatons ... "
    text_btm="Expect to get your hands dirty with hands-on activity within the first 15mins!"
%}

{% include dojo_section.html 
    title="Tertiary engagement"
    first_image_path="/assets/lib/landing/audacity_workshop_16x9.png"
    first_image_alt="Audacity Workshop" 
    first_image_caption="Design Innovation Workshop @ Audacity by Mistletoe"
    second_image_path="/assets/lib/landing/turtle_workshop_16x9.jpg"
    second_image_alt="Turtle Graphics Workshop"
    second_image_caption="Turtle Graphics workshop @ SUTD"
    text_top="From designing a children's card game ... "
    text_mid=" ... to learning to drawing mesmerising geometric shapes ... "
    text_btm="Expect to actively discuss, challenge and learn together with your peers!"
%}

{% include dojo_section.html 
    title="Corporate engagement"
    first_image_path="/assets/lib/landing/tele_bot_workshop_16x9.jpg"
    first_image_alt="Telegram Bot Workshop" 
    first_image_caption="Telegram Bot Workshop @ Geoworks by SLA"
    second_image_path="/assets/lib/landing/nyc_workshop_16x9.png"
    second_image_alt="Community Design Innovation Workshop"
    second_image_caption="Community Design Innovation Workshop @ NYC Youth Council Mission"
    text_top="From learning to build a telegram bot for your business data communications ... "
    text_mid=" ... to designing a more wheelchair friendly corridor ... "
    text_btm="Expect to push the boundaries of how your learnings can be utilised and applied!"
%}

<section>
    <h2 class="my-8 text-4xl text-center">Student Reviews</h2><hr>
    <div class="mt-8 grid-container">
        {% include quotes.html 
            text="I like the workshop and it’s the right level of difficulty, having limited prior experience with coding, it can pose as a little challenge to me and I appreciate the exposure to the workshop :)"
            author="Zhi Ying &mdash; Abstraction Workshop"
        %}
        {% include quotes.html 
            text="Thanks for conducting the workshop and for the tips on school! Appreciate it! 🙏🏻
            The content covered was interesting, easy to follow and the pace was good. The idea of letting us view other participants’ work was cool too."
            author="Bryan &mdash; Turtle Graphics Workshop"
        %}
        {% include quotes.html 
            text="Heyy I really enjoyed the class! To the extent that I would come for other classes if yall do organise em (even though coding aint my fave 👀). 
            I appreciate that the session started with hands on n I really enjoyed your points about the application as well coz it really tied the session for me (esp the biology part I was hooked)."
            author="Rithika &mdash; Recursion Workshop"
        %}
    </div>
</section>


<section class="work_with_us" id="contact">
    <h2 class="my-8 text-4xl text-center">Work with us</h2><hr>
    <div class="mt-8 work_with_us_content">
        <div class="padding-right-large work_with_us_content_el_1">
            <p>Looking for unconventional ways to learn how technology works?</p>
            <p>Looking for a better way to learn about programming?</p>
            <p>Looking for computational thinking workshops?</p>
            <p>Let's have a call to design the perfect lesson together!</p>
        </div>
        {% include contact_form.html href="/dojo" %}
  </div>
</section>

<style>
    div {
        text-align: center;
    }

    h1 {
        font-weight: bold;
        font-size: 7em;
        margin-top: 25vh;
        @media (max-width: 768px) {
            font-size: 3em;
        }
    }

    section {
        margin: 30vh 0;
    }

    .grid-container {
        display: grid;
        grid-template-columns: repeat(3, 1fr); /* 3 columns on larger screens */
      
        @media (max-width: 768px) {
            grid-template-columns: 1fr; /* 1 column on smaller screens */
            row-gap: 10vh;
        }
    }

    .grid-item {
        background-color: #3498db;
        text-align: center;
        font-size: 20rem;
        border-radius: 10px;
    }

    .work_with_us {
        padding-bottom: 100px;
        
        .work_with_us_content {
            text-align: left;
            display: flex;
            justify-content: center;

            @media (max-width: 768px) {
                flex-direction: column;
            }

            .work_with_us_content_el_1 {
                flex-basis: 60%;
                text-align: left;
            }
        }
    }
</style>
