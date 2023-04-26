
configs = {

    user:{
        x:0,
        y:0,
    },

    phone:{

    }
}

function preload()
{
    configs.phone.image = loadImage('https://walter-dalla.github.io/POC-CapaDeCelular/phone.png');
    configs.user.image = loadImage('https://walter-dalla.github.io/POC-CapaDeCelular/mike.png');
}

function setup() {
  createCanvas(400, 800);
  
  image( configs.user.image, 0, 0);
  
  
  let button = createButton('Adicione uma imagem');
  button.position(10, height + 10);
  button.mousePressed(loadUserImage);

  return;
}

function draw() {
    clear()
    image(configs.user.image, configs.user.x, configs.user.y); 
    image(configs.phone.image, 0, 0);



    //debug
    return;
    noFill();
    stroke(255, 0, 0);
    strokeWeight(20);
    rect(
        configs.user.x,
        configs.user.y,
        configs.user.image.width,
        configs.user.image.height,
    );
}

function mouseDragged() {
    if (mouseX >= configs.user.x && mouseX <= configs.user.x + configs.user.image.width &&
        mouseY >= configs.user.y && mouseY <= configs.user.y + configs.user.image.height) {
      // if the mouse is within the bounds of the user.image
      configs.user.x = mouseX - configs.user.image.width / 2; // set the image position to the center of the mouse
      configs.user.y = mouseY - configs.user.image.height / 2;
    }
  }

  
function loadUserImage() {
    let input = createFileInput(handleUserImageLoad);
    input.position(10, height + 40);
    input.elt.click();
  }
  
  function handleUserImageLoad(file) {
    if (file.type === 'image') {
      let img = loadImage(file.data, function() {
        configs.user.image = img;
      });
    }
  }