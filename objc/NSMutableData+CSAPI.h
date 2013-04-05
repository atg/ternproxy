//
//  NSMutableData+CSAPI.h
//  Activator
//
//  Created by Nicholas Penree on 9/1/08.
//  Copyright 2008 Conceited Software. All rights reserved.
//
#import <Cocoa/Cocoa.h>

extern NSString *CSStringBoundary;

@interface NSMutableDataCSAPIDummy : NSObject
{
  
}



@end


@protocol CSAPIAttachment

- (NSString *)filename;
- (NSString *)contentType;
- (NSData *)data;

@end

@interface NSMutableData (CSAPI)

- (void)appendValue:(id)value forField:(NSString *)field;
- (void)appendStringValue:(NSString *)value forField:(NSString *)field;
- (void)appendDataValue:(NSData *)value forField:(NSString *)field;
- (void)appendAttachmentValue:(NSObject <CSAPIAttachment>*)value forField:(NSString *)field;

#if !TARGET_OS_IPHONE
- (void)appendImageValue:(NSImage *)value forField:(NSString *)field;
#else
- (void)appendImageValue:(UIImage *)value forField:(NSString *)field;
#endif

@end