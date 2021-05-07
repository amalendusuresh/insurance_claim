'use strict';
const shim = require('fabric-shim');
const util = require('util');
var log4js = require('log4js');
var logger = log4js.getLogger('ChaincodeLogger');

// ===============================================
// Chaincode name:[insuranceClaim.js]
// ===============================================
let Chaincode = class {
    async Init(stub) {
        let ret = stub.getFunctionAndParameters();
        logger.info(ret);
        logger.info('=========== Instantiated Chaincode ===========');
        return shim.success();
    }

    async Invoke(stub) {
        logger.info('Transaction ID: ' + stub.getTxID());
        logger.info(util.format('Args: %j', stub.getArgs()));

        let ret = stub.getFunctionAndParameters();
        logger.info(ret);

        let method = this[ret.fcn];
        if (!method) {
            logger.error('no function of name:' + ret.fcn + ' found');
            throw new Error('Received unknown function ' + ret.fcn + ' invocation');
        }
        try {
            let payload = await method(stub, ret.params, this);
            return shim.success(payload);
        } catch (err) {
            logger.error(err);
            return shim.error(err);
        }
    }

// ============================================================================================================================
// Create the Insuree
// ============================================================================================================================

    async function createInsuree(application) {
        logger.info("============= START: createInsuree =============");
        let jsonResp = {}  
        if (args.length != 5) {
            jsonResp.success = false
            jsonResp.errorCode = 'C-10000';
            jsonResp.errorMsg = 'Incorrect number of arguments. Expecting 5 arguments';
            throw new Error(JSON.stringify(jsonResp));
        }
        if (!args[0]) {
            jsonResp.success = false
            jsonResp.errorCode = 'C-10001';
            jsonResp.errorMsg = 'mandatory argument Id is missing';
            throw new Error(JSON.stringify(jsonResp));
        }
        if (!args[1]) {
            jsonResp.success = false
            jsonResp.errorCode = 'C-10002';
            jsonResp.errorMsg = 'mandatory argument FirstName is missing'; 
            throw new Error(JSON.stringify(jsonResp));
        }
        if (!args[2]) {
            jsonResp.success = false
            jsonResp.errorCode = 'C-10003';
            jsonResp.errorMsg = 'mandatory argument LastName is missing';
            throw new Error(JSON.stringify(jsonResp));
        }
        if (!args[3]) {
            jsonResp.success = false
            jsonResp.errorCode = 'C-10004';
            jsonResp.errorMsg = 'mandatory argument SSN is missing'; 
            throw new Error(JSON.stringify(jsonResp));
        }
        if (!args[4]) {
            jsonResp.success = false
            jsonResp.errorCode = 'C-10005';
            jsonResp.errorMsg = 'mandatory argument PolicyNumber is missing';
            throw new Error(JSON.stringify(jsonResp));
        }
           
                  
        const factory = getFactory();
        const namespace = 'insurance.claim';
   
        const insuree = factory.newResource(namespace, 'Insuree', application.insureeId);
        insuree.firstName = application.firstName;;
        insuree.lastName = application.lastName;
        insuree.ssn = application.ssn;;
        insuree.policyNumber = application.policyNumber;;
        const participantRegistry = await getParticipantRegistry(insuree.getFullyQualifiedType());
        await participantRegistry.add(insuree);
   
        // emit event
        const initEventEvent = factory.newEvent(namespace, 'InitEvent');
        initEventEvent.insuree = insuree;
        emit(initEventEvent);
    } 

// ============================================================================================================================
// Insuree report the lost
// ============================================================================================================================

    async function ReportLost(request) { 
        logger.info("============= START: ReportLost =============");
        let jsonResp = {}  
        if (args.length != 4) {
            jsonResp.success = false
            jsonResp.errorCode = 'C-10000';
            jsonResp.errorMsg = 'Incorrect number of arguments. Expecting 4 arguments';
            throw new Error(JSON.stringify(jsonResp));
        }
        if (!args[0]) {
            jsonResp.success = false
            jsonResp.errorCode = 'C-10001';
            jsonResp.errorMsg = 'mandatory argument claimId is missing';
            throw new Error(JSON.stringify(jsonResp));
        }
        if (!args[1]) {
            jsonResp.success = false
            jsonResp.errorCode = 'C-10002';
            jsonResp.errorMsg = 'mandatory argument desc is missing'; 
            throw new Error(JSON.stringify(jsonResp));
        }
        if (!args[2]) {
            jsonResp.success = false
            jsonResp.errorCode = 'C-10003';
            jsonResp.errorMsg = 'mandatory argument insureeId is missing';
            throw new Error(JSON.stringify(jsonResp));
        }
        if (!args[3]) {
            jsonResp.success = false
            jsonResp.errorCode = 'C-10004';
            jsonResp.errorMsg = 'mandatory argument policeId is missing'; 
            throw new Error(JSON.stringify(jsonResp));
        }
        
        const factory = getFactory();
        const namespace = 'insurance.claim';
        let claimId = request.claimId;
        let desc = request.desc;
        let insureeId = request.insureeId;
        let policeId = request.policeId;
      
        const claim = factory.newResource(namespace, 'Claim', claimId);
        claim.desc = desc;
        claim.status = "ReportLost";
        claim.insureeId = insureeId;
        claim.policeId = policeId;
        claim.insurerId = "";
        claim.comment = "";
        claim.processAt = (new Date()).toString();
        const claimRegistry = await getAssetRegistry(claim.getFullyQualifiedType());
        await claimRegistry.add(claim);
   
        // emit event
        const reportLostEvent = factory.newEvent(namespace, 'ReportLostEvent');
        reportLostEvent.claim = claim;
        emit(reportLostEvent);
    }

// ============================================================================================================================
// police return requested Information
// ============================================================================================================================

    async function RequestedInfo(request) { 
        const factory = getFactory();
        const namespace = 'insurance.claim';
        let claim = request.claim;
        if (claim.status !== 'ReportLost') {
            throw new Error ('This claim should be in ReportLost status');
        } 
        claim.status = 'RequestedInfo';
        claim.processAt = (new Date()).toString();
        const assetRegistry = await getAssetRegistry(request.claim.getFullyQualifiedType());
        await assetRegistry.update(claim);
   
        // emit event
        const requestedInfoEventEvent = factory.newEvent(namespace, 'RequestedInfoEvent');
        requestedInfoEventEvent.claim = claim;
        emit(requestedInfoEventEvent);
    }
// ============================================================================================================================
//  police submit a claim to insurer
// ============================================================================================================================

    async function SubmitClaim(request) { 
        const factory = getFactory();
        const namespace = 'insurance.claim';
        let claim = request.claim;
        if (claim.status !== 'RequestedInfo') {
            throw new Error ('This claim should be in RequestedInfo status');
        } 
        claim.status = 'SubmitClaim';
        claim.processAt = (new Date()).toString();
        const assetRegistry = await getAssetRegistry(request.claim.getFullyQualifiedType());
        await assetRegistry.update(claim);
   
        // emit event
        const submitClaimEvent = factory.newEvent(namespace, 'SubmitClaimEvent');
        submitClaimEvent.claim = claim;
        emit(submitClaimEvent);

    }

// ============================================================================================================================
// insurer confirm get police submission
// ============================================================================================================================

    async function ConfirmClaimSubmission(request) { 
        const factory = getFactory();
        const namespace = 'insurance.claim';
        let claim = request.claim;
        if (claim.status !== 'SubmitClaim') {
            throw new Error ('This claim should be in SubmitClaim status');
        } 
        claim.status = 'ConfirmClaimSubmission';
        claim.processAt = (new Date()).toString();
        const assetRegistry = await getAssetRegistry(request.claim.getFullyQualifiedType());
        await assetRegistry.update(claim);
   
        // emit event
        const confirmClaimSubmissionEvent = factory.newEvent(namespace, 'ConfirmClaimSubmissionEvent');
        confirmClaimSubmissionEvent.claim = claim;
        emit(confirmClaimSubmissionEvent);
    }

// ============================================================================================================================
// insurer approval claim
// ============================================================================================================================   

    async function ApproveClaim(request) { 
        const factory = getFactory();
        const namespace = 'insurance.claim';
        let claim = request.claim;
        if (claim.status !== 'ConfirmClaimSubmission') {
            throw new Error ('This claim should be in ConfirmClaimSubmission status');
        } 
        claim.status = 'ApproveClaim';
        claim.processAt = (new Date()).toString();
        const assetRegistry = await getAssetRegistry(request.claim.getFullyQualifiedType());
        await assetRegistry.update(claim);
   
        // emit event
        const approveClaimEvent = factory.newEvent(namespace, 'ApproveClaimEvent');
        approveClaimEvent.claim = claim;
        emit(approveClaimEvent);

    }

}



        


        
        