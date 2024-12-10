---
layout: landing
title: Mathland
permalink: /workshop
---

<!-- Hero image -->
<img class="object-cover w-full h-full" src="/assets/lib/landing/stained_glass.webp" alt="Project Dojo students interacting with collaborative learning medium">
<!-- Hero text -->
<h1 class="text-5xl tracking-tighter sm:text-9xl">Math X Coding</h1>
<div class="text-text">Holiday Workshops</div>
<div class="text-text">Near Beauty World MRT</div>
<div class="text-text">9.30am-12.30pm</div>
<div class="text-text">16-22nd Dec</div>


<!-- Tree gif -->
<img class="object-cover w-full h-full" src="/assets/lib/landing/tree.gif" alt="Project Dojo students interacting with collaborative learning medium">
<h2 class="my-8 text-4xl">“Math is hidden everywhere for us to discover”</h2>

<div class="text-text">We often think learning math is just memorising formulas.</div>
<div class="text-text">That’s wrong!</div>
<div class="text-text">It’s much more than that!</div>
<div class="text-text">It’s about studying patterns in our everyday lives.</div>


<!-- Knowledge Park gif -->
<img class="object-cover w-full h-full" src="/assets/lib/landing/knowledge_park.gif" alt="Project Dojo students interacting with collaborative learning medium">
<h2 class="my-8 text-4xl">Play around to find out!</h2>

<div class="text-text">True understanding of the beauty of maths arises from personal involvement. Students form their own connections and rediscover for themselves the theorems underlying the geometrical world.</div>
<div class="text-text">Look at the tree pattern above, it invites one to study it, understand how it comes about and what similar processes in nature results in this form. </div>
<div class="text-text">What form of trees exhibit similar shape of growth? What urges it to grow in such a manner? What are the forces acting upon it?</div>
<div class="text-text">The computer allows them to discover math, showing harmony in unexpected places. </div>
<div class="text-text">A tool for formulating original hypotheses and modelling the world around them and testing the intuitions within them. All while sharing and expressing it amongst their peers.</div>


<section>
    <h2 class="my-8 text-4xl text-center">Student Reviews</h2><hr>
    <div class="mt-8 grid-container">
        {% include quotes.html 
            text="I’ve not seen Adam sit down and work on something in class for so long before. I’m so happy to see him spending time and obsessing over building his own shapes. Good job to the instructors for achieving this!"
            author="Nancy"
        %}
        {% include quotes.html 
            text="My daughter was so excited to share with me how she made a heart shape on the computer. I was surprised to hear her telling me about how she played around with the angles to achieve that because math wasn’t something she was particularly interested in!"
            author="Mabia"
        %}
    </div>
</section>


<!-- Senang -->
<img class="object-cover w-full h-full" src="/assets/lib/landing/senang_16x9.webp" alt="Project Dojo students interacting with collaborative learning medium">

<!-- FAQ -->
<h2 class="my-8 text-4xl">FAQ</h2>
<div class="px-4 pb-16 mx-auto sm:max-w-xl md:max-w-full lg:max-w-screen-xl md:px-24 lg:px-8 lg:pb-20">
  <div class="max-w-xl sm:mx-auto lg:max-w-2xl">
    <div class="space-y-4">
        <!-- Question -->
        <div class="border-b">
            <button type="button" aria-label="Open item" title="Open item" class="flex items-center justify-between w-full p-4 focus:outline-none" onclick="toggleAccordion(this)">
                <p class="text-left">Does my child need to know how to code before coming for class?</p>
                <svg viewBox="0 0 24 24" class="w-3 text-gray-600 transition-transform duration-200"><polyline fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-miterlimit="10" points="2,7 12,17 22,7" stroke-linejoin="round"></polyline></svg>
            </button>
            <div class="hidden p-4 pt-0"><p class="text-gray-700">NOPE! Our workshops are beginner friendly.</p></div>
        </div>
        <!-- Question -->
        <div class="border-b">
            <button type="button" aria-label="Open item" title="Open item" class="flex items-center justify-between w-full p-4 focus:outline-none" onclick="toggleAccordion(this)">
                <p class="text-left">What is the student-to-instructor ratio?</p>
                <svg viewBox="0 0 24 24" class="w-3 text-gray-600 transition-transform duration-200"><polyline fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-miterlimit="10" points="2,7 12,17 22,7" stroke-linejoin="round"></polyline></svg>
            </button>
            <div class="hidden p-4 pt-0"><p class="text-gray-700">Maximum will be 1 instructor : 6 students</p></div>
        </div>
        <!-- Question -->
        <div class="border-b">
            <button type="button" aria-label="Open item" title="Open item" class="flex items-center justify-between w-full p-4 focus:outline-none" onclick="toggleAccordion(this)">
                <p class="text-left">What should my child bring to the workshop?</p>
                <svg viewBox="0 0 24 24" class="w-3 text-gray-600 transition-transform duration-200"><polyline fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-miterlimit="10" points="2,7 12,17 22,7" stroke-linejoin="round"></polyline></svg>
            </button>
            <div class="hidden p-4 pt-0"><p class="text-gray-700">Students are encouraged to bring their own laptop along. Otherwise, please inform us prior.</p></div>
        </div>
        <!-- Question -->
        <div class="border-b">
            <button type="button" aria-label="Open item" title="Open item" class="flex items-center justify-between w-full p-4 focus:outline-none" onclick="toggleAccordion(this)">
                <p class="text-left">How do I make payment?</p>
                <svg viewBox="0 0 24 24" class="w-3 text-gray-600 transition-transform duration-200"><polyline fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-miterlimit="10" points="2,7 12,17 22,7" stroke-linejoin="round"></polyline></svg>
            </button>
            <div class="hidden p-4 pt-0"><p class="text-gray-700">Payment will be made in person at the end of the first workshop. </p></div>
        </div>
    </div>
  </div>
</div>


<h2 class="my-8 text-4xl">Register Now!</h2>
<!-- Register Form -->
<form id="lettertopaperland" class="flex flex-col p-6 space-y-4 bg-white rounded-lg shadow-lg" accept-charset="UTF-8" action="https://india.fly.dev/proxy/apps/guru/work" method="POST">
    <!-- Name -->
    <label for="name-input" class="font-medium text-gray-700">Name*</label>
    <input id="name-input" type="text" name="name" placeholder="Alan Kay" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
    <!-- Phone number -->
    <label for="phone-input" class="font-medium text-gray-700">Phone Number*</label>
    <input id="phone-input" type="tel" name="phone" placeholder="+65 91234567" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required />
    <!-- Multiple Date Selection -->
    <label class="font-medium text-gray-700">Your Available Dates (allow multiple):</label>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2" id="date-selection-container">
        <!-- Monday -->
        <button 
          type="button" 
          class="p-3 text-center text-gray-800 bg-white border rounded-md hover:bg-gray-200 focus:outline-none focus:ring focus:ring-gray-300"
          onclick="toggleDate(this, 'Monday (16th)')"
        >
          Monday (16th)
        </button>
        <!-- Tuesday -->
        <button 
          type="button" 
          class="p-3 text-center text-gray-800 bg-white border rounded-md hover:bg-gray-200 focus:outline-none focus:ring focus:ring-gray-300"
          onclick="toggleDate(this, 'Tuesday (17th)')"
        >
          Tuesday (17th)
        </button>
        <!-- Wednesday -->
        <button 
          type="button" 
          class="p-3 text-center text-gray-800 bg-white border rounded-md hover:bg-gray-200 focus:outline-none focus:ring focus:ring-gray-300"
          onclick="toggleDate(this, 'Wednesday (18th)')"
        >
          Wednesday (18th)
        </button>
        <!-- Thursday -->
        <button 
          type="button" 
          class="p-3 text-center text-gray-800 bg-white border rounded-md hover:bg-gray-200 focus:outline-none focus:ring focus:ring-gray-300"
          onclick="toggleDate(this, 'Thursday (19th)')"
        >
          Thursday (19th)
        </button>
        <!-- Friday -->
        <button 
          type="button" 
          class="p-3 text-center text-gray-800 bg-white border rounded-md hover:bg-gray-200 focus:outline-none focus:ring focus:ring-gray-300"
          onclick="toggleDate(this, 'Friday (20th)')"
        >
          Friday (20th)
        </button>
        <!-- Saturday -->
        <button 
          type="button" 
          class="p-3 text-center text-gray-800 bg-white border rounded-md hover:bg-gray-200 focus:outline-none focus:ring focus:ring-gray-300"
          onclick="toggleDate(this, 'Saturday (21st)')"
        >
          Saturday (21st)
        </button>
        <!-- Sunday -->
        <button 
          type="button" 
          class="p-3 text-center text-gray-800 bg-white border rounded-md hover:bg-gray-200 focus:outline-none focus:ring focus:ring-gray-300"
          onclick="toggleDate(this, 'Sunday (22nd)')"
        >
          Sunday (22nd)
        </button>
    </div>

<input type="hidden" name="selected_dates" id="selected-dates" />
<input type="hidden" name="return_url" value="{{ page.url | absolute_url }}" />

<div class="flex justify-center">
    <div class="h-captcha" data-sitekey="7688737e-8d00-4c1e-acdc-828ee1c02e08"></div>
    <script src="https://js.hcaptcha.com/1/api.js" async defer></script>
</div>

<button type="submit" class="px-4 py-2 text-white rounded-md bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary">Submit</button>
</form>

<!-- Successful toast -->
<div class="fixed z-50 hidden bottom-4 right-4" id="toast-good">
  <div class="flex items-center p-4 text-green-700 bg-green-100 border border-green-400 rounded-md shadow-lg">
      <i class="mr-2 fa fa-check-circle"></i>
      <span>Sent! To the desks <a class="text-blue-600 underline" href="/about"><b>@paperland</b></a></span>
      <button class="ml-auto text-gray-500 hover:text-gray-700 focus:outline-none" onclick="document.getElementById('toast-good').style.display = 'none';">X</button>
  </div>
</div>

<!-- Failure toast -->
<div class="fixed z-50 hidden bottom-4 right-4" id="toast-bad">
  <div class="flex items-center p-4 text-red-700 bg-red-100 border border-red-400 rounded-md shadow-lg">
      <i class="mr-2 fa fa-check-circle"></i>
      <span>Check the I am human checkbox!</span>
      <button class="ml-auto text-gray-500 hover:text-gray-700 focus:outline-none" onclick="document.getElementById('toast-bad').style.display = 'none';">X</button>
  </div>
</div>






<script>
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('sent') == "true") {
        const element = document.getElementById('toast-good');
        element.style.display = 'block'; // Show the element
    } else if (urlParams.get('sent') == "false") {
        const element = document.getElementById('toast-bad');
        element.style.display = 'block'; // Show the element
    }

    const selectedDates = new Set();

    function toggleDate(button, date) {
    if (selectedDates.has(date)) {
      selectedDates.delete(date);
      button.classList.remove("bg-gray-300");
      button.classList.add("bg-white", "text-gray-800");
    } else {
      selectedDates.add(date);
      button.classList.add("bg-gray-300");
      button.classList.remove("bg-white", "text-gray-800");
    }

    // Update the hidden input with selected dates
    document.getElementById('selected-dates').value = Array.from(selectedDates).join(', ');
  }
</script>
