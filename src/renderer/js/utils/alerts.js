export const alertError = (message) => {
  Toastify.toast({
    text: message,
    duration: 2000,
    close: false,
    gravity: 'top', // `top` or `bottom`
    position: 'left', // `left`, `center` or `right`
    stopOnFocus: true, // Prevents dismissing of toast on hover
    offset: {
      // x: 50, // horizontal axis - can be a number or a string indicating unity. eg: '2em'
      // y: 1, // vertical axis - can be a number or a string indicating unity. eg: '2em'
    },
    style: {
      background: '#e4003c',
      color: 'white',
      textAlign: 'center',
    },
  })
}
export const alertSuccess = (message) => {
  Toastify.toast({
    text: message,
    duration: 2000,
    close: false,
    gravity: 'top', // `top` or `bottom`
    position: 'left', // `left`, `center` or `right`
    stopOnFocus: true, // Prevents dismissing of toast on hover
    offset: {
      // x: 50, // horizontal axis - can be a number or a string indicating unity. eg: '2em'
      y: 1, // vertical axis - can be a number or a string indicating unity. eg: '2em'
    },
    style: {
      // background: 'linear-gradient(to right, #00b09b, #96c93d)',
      background: '#4CAF50',
      color: 'white',
      textAlign: 'center',
    },
  })
}
