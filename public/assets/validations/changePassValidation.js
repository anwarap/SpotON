
const oldPasswordError = document.getElementById("oldPasswordErr")
const newPasswordError = document.getElementById("newPasswordErr")
const confirmPasswordError = document.getElementById("confirmPasswordErr")

const passwordRegex = /^\d{5,}$/;


function validatePassword() {

    let oldPassword = document.getElementById("oldPassword").value.trim()
    let newPassword = document.getElementById("newPassword").value.trim()
    let confirmPassword = document.getElementById("confirmPassword").value.trim()

    if (oldPassword.length === 0) {
        oldPasswordError.innerHTML = "Enter Password!";
        return false;
    }else if(oldPassword.length < 5 ){
        oldPasswordError.innerHTML = "Password must contain 5 characters";
        return false;
    }else if(!oldPassword.match(passwordRegex)){
        oldPasswordError.innerHTML = "Invalid Password";
        return false;
    }else{
        oldPasswordError.innerHTML = '';
    }
    
    if (newPassword.length === 0) {
        newPasswordError.innerHTML = "Enter Password!";
        return false;
    }else if(newPassword.length < 5 ){
        newPasswordError.innerHTML = "Password must contain 5 characters";
        return false;
    }else if(!newPassword.match(passwordRegex)){
        newPasswordError.innerHTML = "Invalid Password";
        return false;
    }else{
        newPasswordError.innerHTML = "";
    }

    
    if (confirmPassword.length === 0) {
        confirmPasswordError.innerHTML = "Enter Password!";
        return false;
    }else if(confirmPassword.length < 5 ){
        confirmPasswordError.innerHTML = "Password must contain 5 characters";
        return false;
    }else if(newPassword !== confirmPassword){
        confirmPasswordError.innerHTML = "Password not matching";
        return false;
    }else{
        confirmPasswordError.innerHTML = "";
    }
    

    return true
}