<div id="top"></div>
<!--
*** Thanks for checking out the Best-README-Template. If you have a suggestion
*** that would make this better, please fork the repo and create a pull request
*** or simply open an issue with the tag "enhancement".
*** Don't forget to give the project a star!
*** Thanks again! Now go create something AMAZING! :D
-->



<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/STRECH-LTD/strech.js">
    <img src="./images/logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Memphis node.js SDK</h3>
</div>
  <!-- <p align="center">
    <a href="https://github.com/othneildrew/Best-README-Template"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/othneildrew/Best-README-Template">View Demo</a>
    ·
    <a href="https://github.com/othneildrew/Best-README-Template/issues">Report Bug</a>
    ·
    <a href="https://github.com/othneildrew/Best-README-Template/issues">Request Feature</a>
  </p>
</div> -->

<!-- TABLE OF CONTENTS -->
<!-- <details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details> -->



<!-- ABOUT THE PROJECT -->


## About The Project

<!-- [![Product Name Screen Shot][product-screenshot]](https://example.com) -->

This is Memphis node.js SDK. It will allow you to connect to memphis server, create applications and facroties, produce and consume messages.
<br/>
And it will be <b>EASY</b>. We promise.


<p align="right">(<a href="#top">back to top</a>)</p>



<!-- ### Built With

This section should list any major frameworks/libraries used to bootstrap your project. Leave any add-ons/plugins for the acknowledgements section. Here are a few examples.

* [Next.js](https://nextjs.org/)
* [React.js](https://reactjs.org/)
* [Vue.js](https://vuejs.org/)
* [Angular](https://angular.io/)
* [Svelte](https://svelte.dev/)
* [Laravel](https://laravel.com)
* [Bootstrap](https://getbootstrap.com)
* [JQuery](https://jquery.com)

<p align="right">(<a href="#top">back to top</a>)</p> -->



## Installation
```sh
  npm install memphis
```
<p align="right">(<a href="#top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
# Usage

## Connect to server
To connect to Memphis server use ```connect()``` function.
<br/>
``` javascript
const memphis = require('memphis');

const connectionDetails = {
    serverUrl: "your Memphis server url"
}

memphis.connect(connectionDetails)
    .then(conn => {
        console.log(`connection details: ${conn}`)
    })
    .catch(err => {
        console.log(`error connecting: ${err}`)
    })

```



## Disconnect from server
To disconnect from Memphis server use ```conn.disconnect()``` function.
<br/>



## Factories
### Applications
An application is a place to bind factories that have some close business logic. We recommend binding few factories together but this is NOT mandatory. 
A factory that does not have an application defined will be associated with a generic application.
<br/>
```
code here
```

### Add factory
To add a new factory, you first have to create a factory object with options that include:
* application - application name you want to associate your factory with (not mandatory).
* retentionType - we support 3 retention policies: 
  * time - messages inside factory will be deleted after a period of time set by the user.
  * size - messages inside factory will be deleted after max factory size.
  * consumed - message will be deleted once being consumed.
* retentionValue - value of the chosen retentionType policy:
  * time - millisecond. 
  * size - bytes.
* throughputType - maximum messages/ bytes per second.
* maxThroughput - Integer value that expresses the throughputType (messages or bytes per second).

To create this object use the method ```conn.factory(factoryName, factoryDetails)```.
<br/>
After object creation, using the method ```myFactory.add()``` will create a new factory.

``` javascript
...
const retentionTypes = memphis.retentionTypes 
//retentionTypes = {
//    TIME: 0,
//    SIZE: 1,
//    CONSUMED: 2
//}

const throughputType = memphis.throughputType
//throughputType = {
//    MESSAGES: 0,
//    BYTES: 1,
//}
...

memphis.connect(connectionDetails)
  .then(conn => {
    const factoryDetails = {
      application: 'myApp',
      retentionType: retentionTypes.SIZE,
      retentionValue: 2000,
      throughputType: throughputType.MESSAGES,
      maxThroughput: 7000
      }

    // Created factory object
    const myFactory = conn.factory("factoryName", factoryDetails)

    // Actualy adds the factory object to Memphis engine
    myFactory.add()
      .then(res => console.log(res))
      .catch(error => {
        console.error(error)
      })

    })
  .catch(err => {
    console.log(`error connecting: ${err}`)
  })
```

### Edit factory
Just edit in the factoryDetails object the keys you want to update by using the ```myFactory.edit(editDetails)``` method.
<br/>

``` javascript
const editDetails = {} //Object contains one or more of the new factoryDetails
myFactory.edit(editDetails)
  .then(res => console.log(res))
  .catch(error => {
    console.error(error)
  })
```


### Remove factory

<br/>

``` javascript
myFactory.remove()
  .then(res => console.log(res))
  .catch(error => {
    console.error(error)
  })
```

## Functions
### Add function
fancDetails - ... after we'll have the endpoints..
<br/>

``` javascript
const fancDetails = {}
myFactory.addFunction(fancDetails, 1) 
//The second arg is the function's location, if not sent the new function will be edded at the end of the "pipeline"
//For example, if we have a function already the method myFactory.addFunction(fancDetails) will add the new function after the first one.
  .then(res => console.log(res))
  .catch(error => {
    console.error(error)
  })
```

### Edit function

<br/>

``` javascript
myFactory.editFunction(fancDetails, 1)
//The second arg is the function's location
  .then(res => console.log(res))
  .catch(error => {
    console.error(error)
  })
```

### Remove function

<br/>

``` javascript
myFactory.removeFunction(5) //Function's location
  .then(res => console.log(res))
  .catch(error => {
    console.error(error)
  })
```

## Produce
To publish a message on Memphis factory first create a producer object using the method ```conn.producer(factory)```, then just publish a message with this producer using the method ```producerMemphis.publish("the message you want to publish")```
<br/>

``` javascript
const producerMemphis = conn.producer("memphis") //Creates a producer object
//Now this producer can publish to Memphis factory
producerMemphis.publish( "the message you want to publish" )
  .then(res => console.log(res))
  .catch(error => {
    console.error(error)
  })
```

## Consume
To consume messages from Memphis factory first create a consumer object using the method ```conn.consumer(factoryName, horizontalScalingGroup)```
> horizontalScalingGroup used for connecting few subscribers to the same consumer, in other words - If you want to scale the consuming process and wish few consumers to split the consuming task, just give them the same horizontalScalingGroup name.
<br/>
Then just consume messages with this consumer using the method ```consumer1.on()```.
<br/>

``` javascript
// Notice that consumer1 will receive all the messages from the factory and consumer2 and consumer3 will split the messages.
const consumer1 = conn.consumer("memphis", "consumer_1")
consumer1.on("message", (msg) => {
  console.log(`msg consumer1: ${msg}`)
})

const consumer2 = conn.consumer("memphis", "consumer_2")
consumer2.on("message", (msg) => {
  console.log(`msg consumer2: ${msg}`)
})
        
const consumer3 = conn.consumer("memphis", "consumer_2")
consumer3.on("message", (msg) => {
  console.log(`msg consumer3: ${msg}`)
})
```


_For more examples, please refer to the [Documentation](https://app.gitbook.com/o/-MSyW3CRw3knM-KGk6G6/s/LatZwPwDjCwbLnmGpBSe/)_

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- ROADMAP -->
## Roadmap

- [x] Add Changelog
- [x] Add back to top links
- [ ] Add Additional Templates w/ Examples
- [ ] Add "components" document to easily copy & paste sections of the readme
- [ ] Multi-language Support
    - [ ] Chinese
    - [ ] Spanish

See the [open issues](https://github.com/othneildrew/Best-README-Template/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- LICENSE -->
## License

Distributed under the Apache License 2.0 License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

Memphis - [@your_twitter](https://twitter.com/your_username) - email@example.com

Project Link: [https://github.com/your_username/repo_name](https://github.com/your_username/repo_name)

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

Use this space to list resources you find helpful and would like to give credit to. I've included a few of my favorites to kick things off!

* [Choose an Open Source License](https://choosealicense.com)
* [GitHub Emoji Cheat Sheet](https://www.webpagefx.com/tools/emoji-cheat-sheet)
* [Malven's Flexbox Cheatsheet](https://flexbox.malven.co/)
* [Malven's Grid Cheatsheet](https://grid.malven.co/)
* [Img Shields](https://shields.io)
* [GitHub Pages](https://pages.github.com)
* [Font Awesome](https://fontawesome.com)
* [React Icons](https://react-icons.github.io/react-icons/search)

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/othneildrew/Best-README-Template.svg?style=for-the-badge
[contributors-url]: https://github.com/othneildrew/Best-README-Template/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/othneildrew/Best-README-Template.svg?style=for-the-badge
[forks-url]: https://github.com/othneildrew/Best-README-Template/network/members
[stars-shield]: https://img.shields.io/github/stars/othneildrew/Best-README-Template.svg?style=for-the-badge
[stars-url]: https://github.com/othneildrew/Best-README-Template/stargazers
[issues-shield]: https://img.shields.io/github/issues/othneildrew/Best-README-Template.svg?style=for-the-badge
[issues-url]: https://github.com/othneildrew/Best-README-Template/issues
[license-shield]: https://img.shields.io/github/license/othneildrew/Best-README-Template.svg?style=for-the-badge
[license-url]: https://www.apache.org/licenses/LICENSE-2.0.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/othneildrew
[product-screenshot]: images/screenshot.png